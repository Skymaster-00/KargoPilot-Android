'use strict';
const ICONS = {
 box:'<path d="m21 8-9-5-9 5v9l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5v5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',
 truck:'<path d="M3 6h11v11H3zM14 10h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
 check:'<path d="m5 12 4 4L19 6"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="16" cy="17" r="3" fill="currentColor"/>',
 copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 external:'<path d="M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
 archive:'<path d="M4 8v13h16V8M3 3h18v5H3zM9 12h6"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>',
 edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7Z"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 15v6h16v-6"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.box}</svg>`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHTML;
const fold = value => String(value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const fresh = () => ({version:1,shipments:[],custom:[],favorites:['yurtici','aras','mng','ptt','hepsijet','trendyol'],preferences:{theme:'system'}});
let state = fresh(), page = 'home', filter = 'active', region = 'all', query = '', modal = null, toastTimer, focusReturn;
function validURL(value) {
 try { const u = new URL(value.replaceAll('{num}','12345')); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password && u.port === '' && u.hostname.includes('.'); } catch { return false; }
}
function validateBackup(raw) {
 if (!raw || raw.version !== 1 || !Array.isArray(raw.shipments) || !Array.isArray(raw.custom) || !Array.isArray(raw.favorites) || raw.shipments.length > 1500 || raw.custom.length > 200) throw Error('Geçersiz yedek biçimi.');
 const ids = new Set(CARRIERS.map(c=>c.id));
 const custom = raw.custom.map(c=>{
  if (!c || typeof c.id !== 'string' || !/^custom-[a-zA-Z0-9-]{1,80}$/.test(c.id) || ids.has(c.id) || typeof c.name !== 'string' || !c.name.trim() || c.name.length>60 || typeof c.url!=='string' || c.url.length>1500 || !validURL(c.url)) throw Error('Geçersiz firma bilgisi.');
  ids.add(c.id); return {id:c.id,name:c.name.trim(),url:c.url,region:'custom',mark:c.name.slice(0,2).toUpperCase(),description:'Eklediğiniz firma',color:'#176653'};
 });
 const recordIds = new Set(), keys = new Set();
 const shipments = raw.shipments.map(s=>{
  if (!s || typeof s.id !=='string' || !/^[a-zA-Z0-9-]{1,100}$/.test(s.id) || recordIds.has(s.id) || !ids.has(s.carrier) || typeof s.number!=='string' || !/^[a-zA-Z0-9-]{5,60}$/.test(s.number) || typeof s.name!=='string' || !s.name.trim() || s.name.length>80 || typeof s.note!=='string' || s.note.length>1000 || !Number.isFinite(s.created) || s.created < 0 || s.created > 8640000000000000 || !['saved','delivered'].includes(s.status) || typeof s.archived!=='boolean') throw Error('Geçersiz gönderi bilgisi.');
  const key=s.carrier+'|'+s.number.toUpperCase(); if(keys.has(key)) throw Error('Yedekte yinelenen gönderi var.'); keys.add(key); recordIds.add(s.id);
  const postalCode=typeof s.postalCode==='string'&&/^[A-Za-z0-9 -]{0,20}$/.test(s.postalCode)?s.postalCode:'';
  const phoneLast4=typeof s.phoneLast4==='string'&&/^(?:\d{4})?$/.test(s.phoneLast4)?s.phoneLast4:'';
  return {id:s.id,carrier:s.carrier,number:s.number,name:s.name.trim(),note:s.note,created:s.created,status:s.status,archived:s.archived,postalCode,phoneLast4,deliveredAt:s.status==='delivered' && Number.isFinite(s.deliveredAt) && s.deliveredAt>=0 && s.deliveredAt<=8640000000000000 ? s.deliveredAt : null};
 });
 return {version:1,shipments,custom,favorites:[...new Set(raw.favorites.filter(id=>ids.has(id)))],preferences:{theme:['system','light','dark'].includes(raw.preferences?.theme)?raw.preferences.theme:'system'}};
}
try { const raw = window.Native ? Native.read() : localStorage.getItem('kargopilot'); if(raw) state = validateBackup(JSON.parse(raw)); } catch { setTimeout(()=>toast('Kayıtlar okunamadı. Varsa yedeğinizi içe aktarabilirsiniz.'),700); }
function commit(next) {
 try { const data=JSON.stringify(next); if(window.Native) { if(!Native.save(data)) throw Error(); } else localStorage.setItem('kargopilot',data); state=next; return true; }
 catch { toast('Kayıt yapılamadı. Depolama alanını kontrol edin.'); return false; }
}
const allCarriers = () => [...CARRIERS,...state.custom];
const carrierById = id => allCarriers().find(c=>c.id===id);
const shipmentById = id => state.shipments.find(s=>s.id===id);
const uid = prefix => prefix+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
const date = time => new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(time);
function mark(carrier) {
 const logo = window.BRAND_ASSETS?.[carrier.id];
 return `<span class="carrier-mark${logo ? ' carrier-logo' : ''}" style="--brand:${carrier.color}" data-brand="${e(carrier.id)}" aria-hidden="true">
  <span class="carrier-initials">${e(carrier.mark)}</span>
  ${logo ? `<img src="${e(logo.file)}" alt="" width="52" height="30" decoding="async">` : ''}
 </span>`;
}
// Keep the initials in place until a bundled logo has actually loaded.
document.addEventListener('load', event => {
 const image = event.target;
 if (image instanceof HTMLImageElement && image.parentElement?.classList.contains('carrier-logo') && image.naturalWidth > 0) {
  image.parentElement.classList.add('logo-loaded');
 }
}, true);
function shipmentDelivered(s){return s.status==='delivered'||(window.liveCache?.[s.id]?.identity===[s.carrier,s.number,s.postalCode||'',s.phoneLast4||''].join('|')&&window.liveCache[s.id].status==='Delivered');}
function toast(text) { const t=document.querySelector('#toast'); t.textContent=text; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),3300); }
const parcelArt = `<svg class="empty-art" viewBox="0 0 120 104" aria-hidden="true"><ellipse cx="60" cy="91" rx="44" ry="7" fill="#edf2e4" stroke="none"/><path d="M23 36 60 17l37 19v40L60 96 23 76Z" fill="#e5eecf" stroke="#a9bc8e"/><path d="m23 36 37 20 37-20M60 56v40M42 26l37 20v16" stroke="#89a875"/><path d="m29 15-4-6m69 11 7-3M12 57H5" stroke="#d4a36b"/><circle cx="103" cy="67" r="4" fill="#f5cc9b" stroke="none"/></svg>`;
function header() { return `<header class="topbar"><div class="brand"><div class="brand-logo">${icon('box')}</div><div><div class="brand-name">KargoPilot<span style="color:#7ca768">.</span></div><div class="brand-sub">PAKETİNİN PEŞİNDE</div></div></div><button class="icon-btn" data-action="add" aria-label="Yeni gönderi ekle">${icon('plus')}</button></header>`; }
function nav() { return `<nav class="bottom-nav" aria-label="Ana menü">${[['home','box','Gönderiler'],['carriers','globe','Firmalar'],['settings','settings','Ayarlar']].map(([id,i,label])=>`<button class="nav-item ${page===id?'active':''}" data-action="nav" data-id="${id}" ${page===id?'aria-current="page"':''}>${icon(i)}<span>${label}</span></button>`).join('')}</nav>`; }
function render() { app.innerHTML=`<main class="page">${header()}${page==='home'?home():page==='carriers'?carriersPage():settingsPage()}</main>${nav()}`; }
function home() {
 const active=state.shipments.filter(s=>!s.archived&&!shipmentDelivered(s)).length;
 const delivered=state.shipments.filter(shipmentDelivered).length;
 return `<section class="hero"><div class="hero-text"><div class="eyebrow"><span class="dot"></span> HER PAKET, TEK YERDE</div><h1>Kargoların,<br>kontrolün altında.</h1><p>Farklı firmalar, farklı paketler.<br>Hepsinin adresi tek bir yer.</p></div><svg class="hero-art" viewBox="0 0 140 160" aria-hidden="true"><path d="M20 20c75-40 115 50 60 55s-80 55 15 66" stroke="#679b7e" stroke-dasharray="5 6"/><circle cx="100" cy="140" r="5" fill="#edab6d" stroke="none"/><path class="parcel" d="m31 62 39-21 39 21v43l-39 22-39-22Z"/><path d="m31 62 39 22 39-22M70 84v43M50 52l39 22v17" stroke="#7c9b5b"/><path d="m41 92 14 8m-14-2 8 5" stroke="#94ac74"/></svg><button class="btn" data-action="add">${icon('plus')} Gönderi ekle ${icon('arrow')}</button></section>
 <section class="stats" aria-label="Gönderi özeti"><div class="stat"><div class="stat-icon">${icon('truck')}</div><div><b>${active}</b><span>Takip ettiğin</span></div></div><div class="stat"><div class="stat-icon">${icon('check')}</div><div><b>${delivered}</b><span>Teslim aldığın</span></div></div></section>
 <div class="section-head"><h2>Gönderilerim</h2><button class="text-btn" data-action="add">+ Yeni ekle</button></div>
 <div class="filters" aria-label="Gönderi filtresi">${[['active','Aktif'],['delivered','Teslim edilen'],['archived','Arşiv']].map(([id,label])=>`<button class="chip ${filter===id?'selected':''}" data-action="filter" data-id="${id}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div>
 ${state.shipments.length?`<div class="searchbox">${icon('search')}<input id="shipment-search" aria-label="Gönderilerde ara" placeholder="Gönderi adı veya takip numarası" value="${e(query)}" maxlength="80"></div>`:''}<div id="shipment-list">${shipmentList()}</div>
 <div class="info-strip">${icon('shield')}<span>Takip numaraların bu cihazda saklanır. Güncel gönderi bilgilerini firmanın resmî sayfasında sorgularsın.</span></div>`;
}
function shipmentList() {
 const list=state.shipments.filter(s=>filter==='archived'?s.archived:!s.archived&&(filter==='delivered'?s.status==='delivered':s.status!=='delivered')).filter(s=>fold(s.name+' '+s.number+' '+carrierById(s.carrier).name).includes(fold(query))).sort((a,b)=>b.created-a.created);
 if(!list.length) return `<div class="empty">${parcelArt}<h3>${query?'Gönderi bulunamadı':filter==='active'?'İlk paketinle başlayalım':filter==='delivered'?'Teslim edilenler burada':'Arşivin şimdilik boş'}</h3><p>${query?'Başka bir ad veya takip numarasıyla tekrar ara.':filter==='active'?'Takip numaranı ekle, gönderilerini tek yerden kolayca yönet.':filter==='delivered'?'Teslim aldığın gönderileri detay ekranından işaretleyebilirsin.':'Arşivlediğin gönderileri bu alanda saklarız.'}</p>${!query&&filter==='active'?`<button class="btn secondary" data-action="add">${icon('plus')} İlk gönderimi ekle</button>`:''}</div>`;
 return list.map(s=>{const c=carrierById(s.carrier);return `<button class="shipment" data-action="detail" data-id="${s.id}"><div class="shipment-top">${mark(c)}<div class="shipment-info"><h3>${e(s.name)}</h3><p>${e(c.name)}</p></div>${icon('chevron')}</div><div class="shipment-bottom"><span class="tracking-no">${e(s.number)}</span><span class="badge ${s.archived?'archive':s.status==='delivered'?'done':''}">${s.archived?'Arşivde':s.status==='delivered'?'Teslim işaretlendi':'Kaydedildi'}</span></div></button>`;}).join('');
}
function carriersPage() { return `<section class="page-heading"><div class="eyebrow" style="color:var(--green)">SINIRLARIN ÖTESİNDE</div><h1>Her paket için<br>bir bağlantı.</h1><p>${CARRIERS.length-1} firma ve 17TRACK sorgulaması. Listede olmayan bir firma için kendi takip bağlantını ekle.</p></section><div class="searchbox">${icon('search')}<input id="carrier-search" placeholder="Firma adıyla ara…" aria-label="Firma ara" value="${e(query)}" maxlength="80"></div><div class="filters">${regionChips('region',region)}</div><div id="carrier-list">${carrierList(false,query,region)}</div><div class="custom-prompt"><h3>Firmanı bulamadın mı?</h3><p>Firmanın HTTPS takip adresini ekle. SMS ile gelen gönderi bağlantısını da kaydedebilirsin.</p><button class="btn secondary" data-action="custom">${icon('plus')} Firma / takip bağlantısı ekle</button></div>`; }
function regionChips(action,value) { return [['all','Tümü'],['tr','Türkiye'],['global','Uluslararası'],['favorites','Favoriler']].map(([id,label])=>`<button class="chip ${value===id?'selected':''}" data-action="${action}" data-id="${id}" aria-pressed="${value===id}">${label}</button>`).join(''); }
function carrierList(picker,q,r) {
 const list=allCarriers().filter(c=>(r==='all'||r==='favorites'&&state.favorites.includes(c.id)||c.region===r)&&fold(c.name+' '+c.description).includes(fold(q)));
 if(!list.length) return `<div class="empty"><h3>Firma bulunamadı</h3><p>Aramayı değiştir veya özel firma ekle.</p></div>`;
 return `<div class="carrier-meta">${list.length} SEÇENEK</div><div class="carrier-list">${list.map(c=>`<div class="carrier-row"><button class="carrier-main" data-action="${picker?'choose':'carrier'}" data-id="${e(c.id)}">${mark(c)}<div><h3>${e(c.name)}</h3><p>${e(c.description)}</p></div></button>${picker?icon('chevron'):`<button class="icon-btn ${state.favorites.includes(c.id)?'favorite':''}" data-action="favorite" data-id="${e(c.id)}" aria-label="${e(c.name)} favori durumunu değiştir" aria-pressed="${state.favorites.includes(c.id)}">${icon('star')}</button>`}</div>`).join('')}</div>`;
}
function settingsPage() { return `<section class="page-heading"><h1>Tamamen senin<br>kontrolünde.</h1><p>Gönderilerin, tercihlerin ve verilerin.</p></section>
 <section class="settings-card"><h3>${icon('lock')} Cihazında, sana özel</h3><p>Gönderilerin bu cihazın uygulama alanında tutulur. Hesap, reklam veya arka planda konum takibi yoktur. Uygulamayı kaldırırsan kayıtların silinir.</p></section>
 <section class="settings-card"><h3>${icon('download')} Yedekle ve geri yükle</h3><p>${state.shipments.length} gönderi · ${state.custom.length} özel firma. Kayıtlarını JSON dosyasına aktar; başka bir cihazda geri yükle. Yedek dosyası takip numaralarını içerir.</p><div class="settings-actions"><button class="btn secondary" data-action="export">${icon('download')} Dışa aktar</button><button class="btn ghost" data-action="import">${icon('upload')} İçe aktar</button></div></section>
 <section class="settings-card"><h3>${icon('info')} Takip nasıl çalışır?</h3><p>“Sorgula” butonu takip numaranı panoya kopyalar ve firmanın resmî sitesini tarayıcında açar. Numaranı yapıştırıp, istenirse güvenlik kodunu girerek güncel durumu öğrenirsin. Firma bilinmiyorsa 17TRACK kullanılabilir.</p><p>Uygulama taşıyıcılardan otomatik veri çekmez ve bildirim göndermez. “Kaydedildi” bir kargo hareketi değildir; teslim işaretini sen belirlersin. Gerçek durum, konum ve teslimat tahmini firmanın sayfasındadır.</p></section>
 <section class="settings-card"><h3>${icon('globe')} Firma kapsamı</h3><p>Türkiye ve dünyadan ${CARRIERS.length-1} firma bağlantısı, 17TRACK seçeneği ve özel firma ekleme. MNG gönderileri DHL eCommerce, Sendeo gönderileri Kolay Gelsin adı altında listelenir. Her firmanın veya numaranın sorgulanabilmesi garanti edilemez; site hizmetleri değişebilir.</p><button class="btn ghost" data-action="nav" data-id="carriers">Firma rehberini aç ${icon('arrow')}</button></section>
 <div class="version"><b>KargoPilot 1.1.2</b><br>Bağımsız bir gönderi düzenleyicisi.<br>Taşıyıcı firmalarla resmî bir bağlantısı yoktur.</div>`; }

function showSheet(content) {
 if(!modalRoot.firstChild) focusReturn=document.activeElement;
 modalRoot.innerHTML=`<div class="modal-overlay"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="handle"></div>${content}</section></div>`;
 document.body.style.overflow='hidden';
 requestAnimationFrame(()=>modalRoot.querySelector('[data-action="close"]')?.focus());
}
const sheetHead = (title,sub='') => `<div class="sheet-head"><div><h2 id="sheet-title">${e(title)}</h2>${sub?`<p>${e(sub)}</p>`:''}</div><button class="icon-btn" data-action="close" aria-label="Kapat">${icon('close')}</button></div>`;
function closeModal() { modal=null; modalRoot.innerHTML=''; document.body.style.overflow=''; if(focusReturn?.isConnected) focusReturn.focus(); }
function openAdd(carrier='yurtici',edit=null,draft=null) {
 const s=edit?shipmentById(edit):null;
 modal={type:'add',edit,draft:draft||{carrier:s?.carrier||carrier,number:s?.number||'',name:s?.name||'',note:s?.note||'',postalCode:s?.postalCode||'',phoneLast4:s?.phoneLast4||''}};
 renderAdd();
}
function captureDraft() { if(modal?.type!=='add') return; for(const field of ['number','name','note']) modal.draft[field]=document.querySelector('#field-'+field)?.value||''; }
function renderAdd() {
 const d=modal.draft,c=carrierById(d.carrier)||CARRIERS[0];
 showSheet(`${sheetHead(modal.edit?'Gönderiyi düzenle':'Yeni bir paket, yeni bir yol','Takip numaranı ekle, gerisini kolaylaştır.')}<form id="shipment-form" novalidate><div class="form-field"><label>Kargo firması</label><button type="button" class="carrier-row" data-action="picker">${mark(c)}<div style="flex:1"><h3>${e(c.name)}</h3><p class="small">Değiştirmek için dokun</p></div>${icon('chevron')}</button></div><div class="form-field"><label for="field-number">Takip numarası</label><input id="field-number" name="number" placeholder="Örn. 123456789012" value="${e(d.number)}" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="60" required><span id="number-error" class="field-error" role="alert"></span></div><div class="form-field"><label for="field-name">Gönderiye bir ad ver <span class="muted">(isteğe bağlı)</span></label><input id="field-name" name="name" placeholder="Örn. Yeni kulaklığım" value="${e(d.name)}" maxlength="80"></div><div class="form-field"><label for="field-note">Kendine not <span class="muted">(isteğe bağlı)</span></label><textarea id="field-note" name="note" placeholder="Sipariş veya teslimat notun…" maxlength="1000">${e(d.note)}</textarea></div><div class="notice">${icon('info')}<span>Sorgularken numaran panoya kopyalanır, firmanın sayfası tarayıcıda açılır. Güncel durumu oradan öğrenirsin.</span></div><div class="form-buttons"><button class="btn ghost" type="submit" data-intent="save">${icon('check')} Kaydet</button><button class="btn" type="submit" data-intent="track">Kaydet ve sorgula ${icon('external')}</button></div></form>`);
}
function saveShipment(track) {
 captureDraft(); const d=modal.draft, number=d.number.trim().replace(/\s+/g,'').toUpperCase();
 const error=document.querySelector('#number-error');
 if(!/^[A-Z0-9-]{5,60}$/.test(number)) { error.textContent='5–60 karakter kullan: harf, rakam veya tire.'; document.querySelector('#field-number').setAttribute('aria-invalid','true'); document.querySelector('#field-number').focus(); return; }
 if(state.shipments.some(s=>s.id!==modal.edit&&s.carrier===d.carrier&&s.number.toUpperCase()===number)) { error.textContent='Bu firmadaki takip numarası zaten kayıtlı.'; return; }
 if(!modal.edit&&state.shipments.length>=1500) {toast('En fazla 1500 gönderi kaydedebilirsin.');return;}
 const old=modal.edit?shipmentById(modal.edit):null;
 const s={id:old?.id||uid('s-'),created:old?.created||Date.now(),status:old?.status||'saved',archived:old?.archived||false,deliveredAt:old?.deliveredAt||null,carrier:d.carrier,number,name:d.name.trim()||carrierById(d.carrier).name+' gönderim',note:d.note.trim(),postalCode:d.postalCode||'',phoneLast4:d.phoneLast4||''};
 const next={...state,shipments:old?state.shipments.map(x=>x.id===s.id?s:x):[s,...state.shipments]};
 if(!commit(next))return;
 page='home';filter=s.archived?'archived':s.status==='delivered'?'delivered':'active';query='';closeModal();render();openDetail(s.id);toast(old?'Gönderi güncellendi.':'Gönderin kaydedildi.');if(track)trackShipment(s.id);
}
function openPicker() { captureDraft();const parent=modal;modal={type:'picker',parent,q:'',r:'all'};renderPicker(); }
function renderPicker() { showSheet(`${sheetHead('Firmanı seç','Türkiye’den dünyaya, paketinin yol arkadaşı.')}<div class="searchbox">${icon('search')}<input id="picker-search" placeholder="Firma adıyla ara…" aria-label="Firma ara" maxlength="80" value="${e(modal.q)}"></div><div class="filters">${regionChips('picker-region',modal.r)}</div><div class="picker-list" id="picker-list">${carrierList(true,modal.q,modal.r)}</div><div class="spacer"></div><button class="btn secondary full" data-action="custom">${icon('plus')} Listede yok, firma ekle</button>`); }
function chooseCarrier(id) { const p=modal.parent;modal=p;modal.draft.carrier=id;renderAdd(); }
function openCustom() { if(modal?.type==='add')captureDraft();const parent=modal;modal={type:'custom',parent};showSheet(`${sheetHead('Kendi firmanı ekle','Listede olmayan gönderiler de yanında.')}<form id="custom-form" novalidate><div class="form-field"><label for="custom-name">Firma adı</label><input id="custom-name" placeholder="Firmanın adı" maxlength="60" required></div><div class="form-field"><label for="custom-url">HTTPS takip bağlantısı</label><input id="custom-url" type="url" placeholder="https://firma.com/takip" maxlength="1500" autocomplete="off" autocapitalize="off" spellcheck="false" required><span class="small">Firmanın takip sayfası veya SMS ile gelen bağlantı. Bağlantıda {num} kullanırsan takip numarası otomatik yerleştirilir.</span><span id="custom-error" class="field-error" role="alert"></span></div><div class="notice">${icon('shield')}<span>Yalnızca güvendiğin firmanın gerçek web adresini ekle. Bu bağlantı tarafımızdan doğrulanmaz.</span></div><button class="btn full" type="submit">${icon('plus')} Firmayı ekle</button></form>`); }
function saveCustom() {
 const name=document.querySelector('#custom-name').value.trim(),url=document.querySelector('#custom-url').value.trim(),error=document.querySelector('#custom-error');
 if(!name||!validURL(url)){error.textContent='Firma adı ve geçerli bir HTTPS adresi gir.';return;}
 if(state.custom.length>=200){error.textContent='En fazla 200 özel firma ekleyebilirsin.';return;}
 const c={id:uid('custom-'),name,url,description:'Eklediğiniz firma',region:'custom',mark:name.slice(0,2).toLocaleUpperCase('tr-TR'),color:'#176653'};
 if(!commit({...state,custom:[...state.custom,c]}))return;
 const p=modal.parent;
 if(p?.type==='picker'){modal=p;chooseCarrier(c.id);}else if(p?.type==='add'){modal=p;modal.draft.carrier=c.id;renderAdd();}else{closeModal();render();openAdd(c.id);}
 toast('Özel firman eklendi.');
}
function openDetail(id) {
 const s=shipmentById(id);if(!s)return;const c=carrierById(s.carrier);modal={type:'detail',id};
 showSheet(`${sheetHead('Gönderi detayın')}<div class="detail-carrier">${mark(c)}<div><h3>${e(s.name)}</h3><p>${e(c.name)}</p></div></div><span class="badge ${s.status==='delivered'?'done':''}">${s.status==='delivered'?'Teslim edildi · sen işaretledin':'Kaydedildi · canlı durum değil'}</span><div class="number-panel"><div class="label">TAKİP NUMARASI</div><div class="number-line"><b>${e(s.number)}</b><button class="icon-btn" data-action="copy" data-id="${id}" aria-label="Takip numarasını kopyala">${icon('copy')}</button></div></div><button class="btn full" data-action="track" data-id="${id}">${icon('external')} ${(c.id==='auto'||c.id==='kargomsende')?"17TRACK’te sorgula":c.region==='custom'?'Takip bağlantısında sorgula':'Resmî sitede sorgula'}</button><div class="notice">${icon('info')}<span>Numaran kopyalanır; açılan sayfaya yapıştır. Canlı durum ve teslimat bilgileri bu sayfada gösterilir.</span></div><div class="detail-actions"><button class="btn ghost" data-action="edit" data-id="${id}">${icon('edit')} Düzenle</button><button class="btn ghost" data-action="share" data-id="${id}">${icon('share')} Paylaş</button></div><div class="detail-actions"><button class="btn secondary" data-action="delivered" data-id="${id}">${icon('check')} ${s.status==='delivered'?'Aktife geri al':'Teslim aldım'}</button><button class="btn secondary" data-action="archive" data-id="${id}">${icon('archive')} ${s.archived?'Arşivden çıkar':'Arşivle'}</button><button class="btn danger" data-action="delete" data-id="${id}" aria-label="Gönderiyi sil">${icon('trash')}</button></div>${s.note?`<div class="detail-note"><b>Notun</b><br>${e(s.note)}</div>`:''}<section class="timeline"><h3>Senin kayıtların</h3>${s.deliveredAt?`<div class="timeline-event"><span class="timeline-point"></span><div><b>Teslim aldığını işaretledin</b><small>${date(s.deliveredAt)}</small></div></div>`:''}<div class="timeline-event"><span class="timeline-point"></span><div><b>Gönderiyi KargoPilot’a ekledin</b><small>${date(s.created)}</small></div></div><small>Bu liste kargo firmasının hareket dökümü değildir.</small></section>`);
}
async function copyNumber(number) {try {if(window.Native)Native.copy(number);else await navigator.clipboard.writeText(number);return true;}catch{toast('Kopyalama yapılamadı. Numaranı elle kopyalayabilirsin.');return false;}}
function trackURL(s) {const c=carrierById(s.carrier);return c.url.replaceAll('{num}',encodeURIComponent(s.number));}
async function trackShipment(id) {
 const shipment = shipmentById(id);
 if (!shipment) return;
 const isPrefilled = carrierById(shipment.carrier).url.includes('{num}');
 if (!isPrefilled && await copyNumber(shipment.number)) toast('Takip numaran panoya kopyalandı.');
 openTrackingURL(trackURL(shipment));
}
function openTrackingURL(url) {
 if (!validURL(url)) return;
 if (window.Native && typeof Native.openTracking === 'function') Native.openTracking(url);
 else openURL(url);
}
function openURL(url) {if(!validURL(url))return;if(window.Native)Native.open(url);else window.open(url,'_blank','noopener,noreferrer');}
function patchShipment(id,patch) {if(commit({...state,shipments:state.shipments.map(s=>s.id===id?{...s,...patch}:s)})){render();openDetail(id);}}
function confirmDialog(title,body,yes,onYes,back) {modal={type:'confirm',onYes,back};showSheet(`${sheetHead(title)}<p class="dialog-copy">${e(body)}</p><div class="form-buttons"><button class="btn ghost" data-action="cancel">Vazgeç</button><button class="btn danger" data-action="confirm">${e(yes)}</button></div>`);}
function restoreParent() {
 if(modal?.type==='confirm'&&modal.back){modal.back();return;}
 if(modal?.parent){const p=modal.parent;modal=p;if(p.type==='add')renderAdd();else if(p.type==='picker')renderPicker();else closeModal();return;}
 closeModal();
}
function exportBackup() {
 const payload=JSON.stringify(state,null,2);
 if(window.Native)Native.exportBackup(payload);else{const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='KargoPilot-yedek.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
function startImport() {if(window.Native)Native.importBackup();else{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',async()=>{const f=input.files[0];if(!f)return;if(f.size>2000000){toast('Yedek dosyası en fazla 2 MB olabilir.');return;}window.receiveBackup(await f.text());});input.click();}}
window.receiveBackup = text => {
 try{const incoming=validateBackup(JSON.parse(text));confirmDialog('Yedeği geri yükle',`${incoming.shipments.length} gönderi ve ${incoming.custom.length} özel firma yüklenecek. Bu işlem mevcut kayıtlarının yerini alır. Önce mevcut kayıtlarını dışa aktarabilirsin.`,'Geri yükle',()=>{if(commit(incoming)){page='home';filter='active';query='';closeModal();render();toast('Yedek başarıyla geri yüklendi.');}},()=>{closeModal();});}
 catch {toast('Yedek geçersiz. Kayıtların değiştirilmedi.');}
};
window.handleBack = () => {if(modal){restoreParent();return true;}if(page!=='home'){page='home';query='';render();return true;}return false;};

document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]');if(!button)return;const {action,id}=button.dataset;
 if(action==='nav'){closeModal();page=id;query='';render();window.scrollTo(0,0);}
 else if(action==='add')openAdd();
 else if(action==='close'||action==='cancel')restoreParent();
 else if(action==='filter'){filter=id;query='';render();}
 else if(action==='region'){region=id;render();}
 else if(action==='picker-region'){modal.r=id;renderPicker();}
 else if(action==='detail')openDetail(id);
 else if(action==='carrier')openAdd(id);
 else if(action==='picker')openPicker();
 else if(action==='choose')chooseCarrier(id);
 else if(action==='custom')openCustom();
 else if(action==='favorite'){const f=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];if(commit({...state,favorites:f}))render();}
 else if(action==='copy'){if(await copyNumber(shipmentById(id).number))toast('Takip numarası kopyalandı.');}
 else if(action==='track')trackShipment(id);
 else if(action==='edit')openAdd(null,id);
 else if(action==='share'){const s=shipmentById(id);const text=`${s.name}\n${carrierById(s.carrier).name}\nTakip no: ${s.number}\n${trackURL(s)}`;if(window.Native)Native.share(text);else if(navigator.share){try{await navigator.share({text});}catch{}}else{await copyNumber(text);toast('Gönderi bilgileri kopyalandı.');}}
 else if(action==='archive'){const s=shipmentById(id);patchShipment(id,{archived:!s.archived});toast(s.archived?'Gönderi arşivden çıkarıldı.':'Gönderi arşivlendi.');}
 else if(action==='delivered'){const s=shipmentById(id),delivered=s.status!=='delivered';patchShipment(id,{status:delivered?'delivered':'saved',deliveredAt:delivered?Date.now():null});toast(delivered?'Teslim aldığını işaretledin.':'Gönderi aktif listesine alındı.');}
 else if(action==='delete')confirmDialog('Gönderi silinsin mi?','Bu gönderi ve notları cihazından silinecek. Bu işlemi geri alamazsın.','Gönderiyi sil',()=>{if(commit({...state,shipments:state.shipments.filter(s=>s.id!==id)})){closeModal();render();toast('Gönderi silindi.');}},()=>openDetail(id));
 else if(action==='confirm')modal.onYes();
 else if(action==='export')exportBackup();
 else if(action==='import')startImport();
});
document.addEventListener('submit',event=>{event.preventDefault();if(event.target.id==='shipment-form')saveShipment(event.submitter?.dataset.intent==='track');else if(event.target.id==='custom-form')saveCustom();});
document.addEventListener('input',event=>{
 const id=event.target.id;
 if(id==='shipment-search'){query=event.target.value;document.querySelector('#shipment-list').innerHTML=shipmentList();}
 else if(id==='carrier-search'){query=event.target.value;document.querySelector('#carrier-list').innerHTML=carrierList(false,query,region);}
 else if(id==='picker-search'){modal.q=event.target.value;document.querySelector('#picker-list').innerHTML=carrierList(true,modal.q,modal.r);}
});
modalRoot.addEventListener('click',event=>{if(event.target.classList.contains('modal-overlay'))restoreParent();});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&modal){event.preventDefault();restoreParent();}
 if(event.key==='Tab'&&modal){const items=[...modalRoot.querySelectorAll('button,input,textarea,select,[tabindex="0"]')].filter(el=>!el.disabled);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){last?.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first?.focus();event.preventDefault();}}
});
render();
