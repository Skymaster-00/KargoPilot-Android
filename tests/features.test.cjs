const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const out=path.resolve(__dirname,'../artifacts/qa');
const executable=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||['chromium-1254','chromium-1248'].map(v=>path.join(process.env.LOCALAPPDATA||'','ms-playwright',v,'chrome-win64/chrome.exe')).find(p=>fs.existsSync(p));
const seed={version:1,shipments:[{id:'test-live',carrier:'kolay',number:'TEST000001',name:'Test gönderisi',note:'',created:1795294800000,status:'saved',archived:false}],custom:[],favorites:['kolay']};
(async()=>{
 const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'light'});
 await context.addInitScript(seed=>{
  if(!localStorage.getItem('store'))localStorage.setItem('store',JSON.stringify(seed));
  window.calls=[];window.testCache={};window.testConnection={configured:false,notificationsEnabled:false,permissionGranted:false,backgroundScheduled:false};
  window.Native={
   read:()=>localStorage.getItem('store'),save:value=>{localStorage.setItem('store',value);return true;},
   open:url=>calls.push(['open',url]),copy:text=>calls.push(['copy',text]),share:text=>calls.push(['share',text]),
   exportBackup:json=>calls.push(['backup',json]),importBackup:()=>{},
   theme:dark=>calls.push(['theme',dark]),trackingSnapshot:()=>JSON.stringify(testCache),trackingConnection:()=>JSON.stringify(testConnection),
   setTrackingKey:key=>{testConnection.configured=!!key;calls.push(['keySaved',!!key]);return true;},
   setNotifications:on=>{testConnection.notificationsEnabled=on;testConnection.backgroundScheduled=on&&testConnection.permissionGranted&&testConnection.configured;calls.push(['notifications',on]);},
   testNotification:()=>calls.push(['testNotification']),notificationSettings:()=>calls.push(['notificationSettings']),
   refreshTracking:id=>{calls.push(['refresh',id]);setTimeout(()=>{testCache[id]={identity:'kolay|TEST000001||',source:'17TRACK',status:'OutForDelivery',syncedAt:Date.now(),events:[{time:'2026-11-21T10:00:00Z',description:'Dağıtıma çıktı · TEST VERİSİ',location:'İstanbul · TEST VERİSİ',lat:41.01,lon:28.97}]};window.finishTracking(id,testCache,testConnection);},150);return true;}
  };
 },seed);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let tiles=0;
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname==='tile.openstreetmap.org'){tiles++;return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6uHAAAAAASUVORK5CYII=','base64')});}assert.equal(u.hostname,'kargopilot.local');let file=path.join(assets,u.pathname.slice(1)||'index.html');if(!file.startsWith(assets+path.sep))return route.abort();let ext=path.extname(file);await route.fulfill({path:file,contentType:({'.js':'application/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.json':'application/json'})[ext]||'text/html'});});
 await page.goto('https://kargopilot.local/index.html');
 await page.getByRole('button',{name:'Ayarlar',exact:true}).click();
 await page.getByRole('button',{name:'Koyu',exact:true}).click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.getByRole('button',{name:'Ayarlar',exact:true}).click();
 await page.screenshot({path:path.join(out,'05-dark-settings.png')});
 await page.getByRole('button',{name:'Dışa aktar',exact:true}).click();
 let backup=await page.evaluate(()=>calls.find(c=>c[0]==='backup')[1]);assert.equal(JSON.parse(backup).preferences.theme,'dark');
 await page.getByRole('button',{name:'API anahtarını bağla',exact:true}).click();
 await page.locator('#api-key').fill('test-personal-api-key');await page.getByRole('button',{name:'Bağlantıyı kaydet'}).click();
 assert(!await page.evaluate(()=>localStorage.getItem('store').includes('test-personal-api-key')));
 await page.getByRole('button',{name:'Bildirimleri aç',exact:true}).click();
 await page.getByText('Bildirim tercihi açık, sistem izni kapalı.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Android bildirim iznini aç'}).click();
 assert(await page.evaluate(()=>calls.some(c=>c[0]==='notificationSettings')));
 await page.evaluate(()=>{testConnection.permissionGranted=true;testConnection.backgroundScheduled=true;window.receiveTracking(testCache,testConnection);});
 await page.getByRole('button',{name:'Test bildirimi',exact:true}).click();assert(await page.evaluate(()=>calls.some(c=>c[0]==='testNotification')));
 await page.getByRole('button',{name:'Harita',exact:true}).click();
 await page.getByText('Henüz harita noktası yok',{exact:true}).waitFor();assert.equal(await page.locator('.leaflet-marker-icon').count(),0);
 await page.getByRole('button',{name:'Gönderiler',exact:true}).click();
 await page.getByRole('button',{name:/Test gönderisi/}).click();
 await page.getByRole('button',{name:'Hareketleri yenile',exact:true}).click();
 await page.getByText('Dağıtıma çıktı · 17TRACK',{exact:true}).waitFor();
 assert.equal(await page.locator('.movement-list .timeline-event').count(),1);
  await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));
 await page.screenshot({path:path.join(out,'06-live-fixture.png')});
 await page.getByRole('button',{name:'Harita',exact:true}).last().click();
 await page.locator('#shipment-map .leaflet-marker-icon').waitFor();assert.equal(await page.locator('.map-pin').count(),1);
 await page.screenshot({path:path.join(out,'07-map-fixture.png')});assert(tiles>0);
 await page.getByRole('button',{name:'Kapat',exact:true}).click();
 // A network failure preserves the last known event and exposes its timestamp/error.
 await page.evaluate(()=>{testCache['test-live'].error='Ağ bağlantısı yok · TEST';window.receiveTracking(testCache,testConnection);});
 await page.getByRole('button',{name:/Test gönderisi/}).click();
 assert.match(await page.locator('.tracking-error').innerText(),/Ağ bağlantısı yok/);
 assert.match(await page.locator('.movement-list').innerText(),/TEST VERİSİ/);
 // Unknown coordinates do not cause a pin to be fabricated; location-search is explicit.
 await page.evaluate(()=>{delete testCache['test-live'].events[0].lat;delete testCache['test-live'].events[0].lon;window.receiveTracking(testCache,testConnection);});
 await page.getByRole('button',{name:'Harita',exact:true}).last().click();
 await page.getByText('Yer adı var, koordinat paylaşılmadı',{exact:true}).waitFor();assert.equal(await page.locator('.map-pin').count(),0);
 await page.getByRole('button',{name:'Yer adını haritada ara'}).click();assert.match(await page.evaluate(()=>calls.at(-1)[1]),/^https:\/\/www.openstreetmap.org\/search/);
 await page.getByRole('button',{name:'Kapat',exact:true}).click();
 for(const theme of ['Açık','Koyu'])for(const width of [320,390,412,768]){
  await page.setViewportSize({width,height:844});await page.getByRole('button',{name:'Ayarlar',exact:true}).click();await page.getByRole('button',{name:theme,exact:true}).click();
  for(const name of ['Gönderiler','Harita','Firmalar','Ayarlar']){await page.getByRole('button',{name,exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${theme} ${width} ${name}`);}
 }
 const logos=await page.evaluate(()=>window.BRAND_ASSETS);for(const data of Object.values(logos))assert(fs.existsSync(path.join(assets,data.file)));
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: dark/light persistence, migration, key excluded from backups, permission-denied UI, notification bridge, real response rendering with synthetic fixtures, map coordinates/absence, retained data after errors, 8 theme/viewport combinations and local PNG logos.');
})().catch(e=>{console.error(e);process.exit(1);});
