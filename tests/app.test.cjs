const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const assets = path.resolve(__dirname, '../app/src/main/assets');
const output = path.resolve(__dirname, '../artifacts/qa');
fs.mkdirSync(output, { recursive: true });
const localChrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || [
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1254/chrome-win64/chrome.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1248/chrome-win64/chrome.exe')
].find(p => fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({headless:true, ...(localChrome ? {executablePath:localChrome} : {})});
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  await context.addInitScript(() => {
    window.bridgeCalls = [];
    // Android's synchronous bridge contract, with durable storage across reloads.
    window.Native = {
      read:()=>localStorage.getItem('test-native-store') || '',
      save:json=>{localStorage.setItem('test-native-store',json);return true;},
      copy:text=>window.bridgeCalls.push({method:'copy',text}),
      open:url=>window.bridgeCalls.push({method:'open',url}),
      share:text=>window.bridgeCalls.push({method:'share',text}),
      exportBackup:json=>window.bridgeCalls.push({method:'export',json}),
      importBackup:()=>window.bridgeCalls.push({method:'import'})
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error=>errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    assert.equal(url.hostname,'kargopilot.local','Unexpected remote request');
    const name=decodeURIComponent(url.pathname).slice(1)||'index.html';
    const file=path.join(assets,name);
    if(!file.startsWith(assets+path.sep)) return route.abort();
    const type=name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.ttf')?'font/ttf':'text/html';
    await route.fulfill({path:file,contentType:type});
  });
  await page.goto('https://kargopilot.local/index.html');
  await page.getByText('İlk paketinle başlayalım').waitFor();
  await page.screenshot({path:path.join(output,'01-home.png')});

  // Invalid input and duplicate prevention, including after reloading storage.
  await page.getByRole('button',{name:'İlk gönderimi ekle'}).click();
  await page.locator('#field-number').fill('123');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  assert.match(await page.locator('#number-error').innerText(),/5–60/);
  await page.locator('#field-number').fill('0012 3456 7890');
  await page.locator('#field-name').fill('Yeni kulaklığım');
  await page.locator('#field-note').fill('Kapıya bırakma. <script>window.hacked=true</script>');
  await page.getByRole('button',{name:'Kaydet ve sorgula'}).click();
  await page.getByText('Gönderi detayın',{exact:true}).waitFor();
  assert.equal(await page.locator('.number-line b').innerText(),'001234567890');
  assert.equal(await page.evaluate(()=>window.hacked),undefined);
  const calls=await page.evaluate(()=>window.bridgeCalls);
  assert.deepEqual(calls.slice(-2).map(c=>c.method),['copy','open']);
  assert.equal(calls.at(-2).text,'001234567890');
  assert.match(calls.at(-1).url,/^https:\/\/www.yurticikargo.com\//);
  await page.getByRole('button',{name:'Paylaş',exact:true}).click();
  assert.match(await page.evaluate(()=>window.bridgeCalls.at(-1).text),/001234567890/);
  await page.getByRole('button',{name:'Kapat',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:/Yeni kulaklığım/}).waitFor();
  await page.getByRole('button',{name:'Yeni gönderi ekle'}).click();
  await page.locator('#field-number').fill('001234567890');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  assert.match(await page.locator('#number-error').innerText(),/zaten kayıtlı/);

  // Search and returning from the picker keep the in-progress form intact.
  await page.locator('#field-number').fill('ABC000012345');
  await page.locator('#field-name').fill('İkinci paketim');
  await page.locator('[data-action="picker"]').click();
  await page.locator('#picker-search').fill('sendeo');
  assert.equal(await page.locator('#picker-list .carrier-row').count(),1);
  await page.getByRole('button',{name:/Kolay Gelsin/}).click();
  assert.equal(await page.locator('#field-name').inputValue(),'İkinci paketim');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  await page.getByRole('button',{name:'Teslim aldım',exact:true}).click();
  assert.equal(await page.getByText('Teslim edildi · sen işaretledin',{exact:true}).count(),1);
  await page.getByRole('button',{name:'Arşivle',exact:true}).click();
  await page.getByRole('button',{name:'Kapat',exact:true}).click();
  await page.getByRole('button',{name:'Arşiv',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:/İkinci paketim/}).count(),1);
  await page.getByRole('button',{name:/İkinci paketim/}).click();
  await page.getByRole('button',{name:'Arşivden çıkar',exact:true}).click();
  await page.getByRole('button',{name:'Aktife geri al',exact:true}).click();
  await page.getByRole('button',{name:'Kapat',exact:true}).click();
  await page.getByRole('button',{name:'Aktif',exact:true}).click();
  await page.locator('#shipment-search').fill('kulak');
  assert.equal(await page.locator('.shipment').count(),1);
  await page.locator('#shipment-search').fill('');
  assert.equal(await page.locator('.shipment').count(),2);

  // Custom carrier URL is validated; substitution encodes the tracking number.
  await page.getByRole('button',{name:'Yeni gönderi ekle'}).click();
  await page.locator('#field-number').fill('TEST-12345');
  await page.locator('[data-action="picker"]').click();
  await page.getByRole('button',{name:'Listede yok, firma ekle'}).click();
  await page.locator('#custom-name').fill('Özel Taşıyıcı');
  await page.locator('#custom-url').fill('javascript:alert(1)');
  await page.getByRole('button',{name:'Firmayı ekle',exact:true}).click();
  assert.match(await page.locator('#custom-error').innerText(),/HTTPS/);
  await page.locator('#custom-url').fill('https://example.com/track?number={num}');
  await page.getByRole('button',{name:'Firmayı ekle',exact:true}).click();
  assert.equal(await page.locator('#field-number').inputValue(),'TEST-12345');
  await page.getByRole('button',{name:'Kaydet ve sorgula'}).click();
  assert.equal(await page.evaluate(()=>window.bridgeCalls.at(-1).url),'https://example.com/track?number=TEST-12345');
  await page.getByRole('button',{name:'Gönderiyi sil',exact:true}).click();
  await page.getByRole('button',{name:'Vazgeç',exact:true}).click();
  await page.getByRole('button',{name:'Gönderiyi sil',exact:true}).click();
  await page.getByRole('button',{name:'Gönderiyi sil',exact:true}).click();
  assert.equal(await page.locator('.shipment').count(),2);

  // Carrier search, favorites and backup validation/restore flows.
  await page.getByRole('button',{name:'Firmalar',exact:true}).click();
  await page.locator('#carrier-search').fill('mng');
  assert.equal(await page.locator('#carrier-list .carrier-row').count(),1);
  await page.locator('#carrier-search').fill('');
  await page.getByRole('button',{name:'Yurtiçi Kargo favori durumunu değiştir',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Yurtiçi Kargo favori durumunu değiştir',exact:true}).getAttribute('aria-pressed'),'false');
  await page.getByRole('button',{name:'Ayarlar',exact:true}).click();
  await page.getByRole('button',{name:'Dışa aktar',exact:true}).click();
  const backup=await page.evaluate(()=>window.bridgeCalls.at(-1).json);
  assert.equal(JSON.parse(backup).shipments.length,2);
  await page.evaluate(()=>window.receiveBackup('{"version":999}'));
  assert.equal(await page.locator('[role="dialog"]').count(),0);
  await page.evaluate(value=>window.receiveBackup(value),backup);
  await page.getByRole('button',{name:'Vazgeç',exact:true}).click();
  await page.evaluate(value=>window.receiveBackup(value),backup);
  await page.getByRole('button',{name:'Geri yükle',exact:true}).click();
  assert.equal(await page.locator('.shipment').count(),2);
  await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));
  await page.screenshot({path:path.join(output,'02-shipments.png')});

  // Real visual dimensions, text containment and keyboard focus trap.
  for (const width of [320,390,412,768]) {
    await page.setViewportSize({width,height:844});
    for(const name of ['Gönderiler','Firmalar','Ayarlar']) {
      await page.getByRole('button',{name,exact:true}).click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflows at ${width}: ${name}`);
      const badTargets=await page.locator('button').evaluateAll(buttons=>buttons.filter(b=>b.getBoundingClientRect().height>0&&b.getBoundingClientRect().height<39).map(b=>b.textContent));
      assert.deepEqual(badTargets,[],'Small interactive controls');
    }
    await page.getByRole('button',{name:'Yeni gönderi ekle'}).click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Form overflow at ${width}`);
    await page.getByRole('button',{name:'Kapat',exact:true}).click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Firmalar',exact:true}).click();
  await page.screenshot({path:path.join(output,'03-carriers.png')});
  await page.getByRole('button',{name:'Yeni gönderi ekle'}).click();
  await page.screenshot({path:path.join(output,'04-add.png')});
  await page.getByRole('button',{name:'Kapat',exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.intent),'track');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[role="dialog"]').count(),0);
  assert.deepEqual(errors,[],'JavaScript runtime errors');
  await browser.close();
  console.log('PASS: persistence, input validation, duplicate prevention, tracking handoff, sharing, picker, custom URLs, delivery marking, archive, delete, search, favorites, backup, XSS escaping, 4 screen sizes and keyboard navigation.');
})().catch(error=>{console.error(error);process.exit(1);});
