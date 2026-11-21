'use strict';
ICONS.moon='<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>';
ICONS.sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>';
ICONS.bell='<path d="M5 17h14l-2-3V9A5 5 0 0 0 7 9v5l-2 3Zm5 3h4M12 2v2"/>';
ICONS.map='<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16M15 5v16"/>';
ICONS.refresh='<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>';
window.liveCache={};
let liveConnection={configured:false,notificationsEnabled:false,permissionGranted:false,backgroundScheduled:false};
const refreshing=new Set();
const STATUS_LABELS={NotFound:'Henüz hareket yok',InfoReceived:'Gönderi bilgisi alındı',InTransit:'Yolda',AvailableForPickup:'Teslim noktasında',OutForDelivery:'Dağıtıma çıktı',Delivered:'Teslim edildi',DeliveryFailure:'Teslimat yapılamadı',Exception:'İşlem gerekiyor',Expired:'Takip süresi doldu'};
const nativeMethod=name=>window.Native&&typeof Native[name]==='function';
const liveIdentity=s=>[s.carrier,s.number,s.postalCode||'',s.phoneLast4||''].join('|');
function getLive(s){const data=window.liveCache[s.id];return data?.identity===liveIdentity(s)?data:null;}
function eventDate(value){const parsed=Date.parse(value);return Number.isFinite(parsed)?date(parsed):'Saat bildirilmedi';}
function cleanSnapshots(raw){
 const result={};if(!raw||typeof raw!=='object')return result;
 for(const s of state.shipments){const r=raw[s.id];if(!r||r.identity!==liveIdentity(s))continue;
  const clean={identity:r.identity,status:Object.hasOwn(STATUS_LABELS,r.status)?r.status:'NotFound',syncedAt:Number.isFinite(r.syncedAt)?r.syncedAt:null,attemptAt:Number.isFinite(r.attemptAt)?r.attemptAt:null,error:typeof r.error==='string'?r.error.slice(0,500):'',message:typeof r.message==='string'?r.message.slice(0,500):'',providerName:typeof r.providerName==='string'?r.providerName.slice(0,100):'',events:[]};
  if(r.eta&&typeof r.eta.from==='string')clean.eta={from:r.eta.from,to:r.eta.to,source:r.eta.source};
  if(Array.isArray(r.events))clean.events=r.events.slice(0,120).map(x=>{const ev={time:typeof x.time==='string'?x.time:'',description:typeof x.description==='string'?x.description.slice(0,1500):'',location:typeof x.location==='string'?x.location.slice(0,300):''};if(typeof x.lat==='number'&&Number.isFinite(x.lat)&&Math.abs(x.lat)<=90&&typeof x.lon==='number'&&Number.isFinite(x.lon)&&Math.abs(x.lon)<=180){ev.lat=x.lat;ev.lon=x.lon;}return ev;});
  result[s.id]=clean;
 }return result;
}
function readNativeTracking(){try{if(nativeMethod('trackingSnapshot'))window.liveCache=cleanSnapshots(JSON.parse(Native.trackingSnapshot()));if(nativeMethod('trackingConnection'))liveConnection=JSON.parse(Native.trackingConnection());}catch{toast('Takip kayıtları okunamadı.');}}
function applyTheme(){const preference=state.preferences?.theme||'system';const systemDark=nativeMethod('systemDark')?Native.systemDark():matchMedia('(prefers-color-scheme: dark)').matches;const dark=preference==='dark'||preference==='system'&&systemDark;document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('meta[name="theme-color"]').content=dark?'#141518':'#f6f7f3';if(nativeMethod('theme'))Native.theme(dark);}
function themeControls(){return `<section class="settings-card"><h3>${icon('moon')} Görünüm</h3><p>Gece için koyu, gündüz için açık. İstersen cihazının temasına uyum sağlasın.</p><div class="theme-buttons" aria-label="Tema seçimi">${[['system','Sistem'],['light','Açık'],['dark','Koyu']].map(([id,label])=>`<button class="chip ${state.preferences?.theme===id?'selected':''}" data-action="theme" data-id="${id}" aria-pressed="${state.preferences?.theme===id}">${label}</button>`).join('')}</div></section>`;}
const oldSettingsPage=settingsPage;
settingsPage=function(){
 const connected=liveConnection.configured,enabled=liveConnection.notificationsEnabled,permission=liveConnection.permissionGranted;
 const count=Object.keys(window.BRAND_ASSETS||{}).length;
 const version=oldSettingsPage().match(/KargoPilot ([0-9.]+)/)?.[1]||'';
 return `<section class="page-heading"><h1>Senin tempon,<br>senin tercihin.</h1><p>Tema, canlı takip ve bildirimler bir arada.</p></section>${themeControls()}
 <section class="settings-card"><h3>${icon('refresh')} Canlı takip bağlantısı</h3><div class="connection-state ${connected?'connected':''}"><span class="dot"></span>${connected?'17TRACK anahtarı bağlı':'Canlı takip henüz bağlı değil'}</div><p>Durum ve hareketleri uygulama içinde almak için kişisel 17TRACK API hesabını bağla. İlk sorgu gönderini API hesabına kaydeder; hesap kotanı kullanabilir. Destek ve ek bilgi ihtiyacı firmaya göre değişir.</p><div class="settings-actions"><button class="btn secondary" data-action="api-setup">${icon('lock')} ${connected?'Anahtarı değiştir':'API anahtarını bağla'}</button>${connected?'<button class="btn ghost" data-action="api-disconnect">Bağlantıyı kaldır</button>':''}</div><p class="logo-credit">Anahtar Android Keystore ile şifrelenir, yedek dosyasına veya GitHub’a eklenmez. Kişisel hesap kullanımı içindir.</p></section>
 <section class="settings-card"><h3>${icon('bell')} Kargo hareket bildirimleri</h3><p>${enabled?(permission?'Bildirim izni açık.':'Bildirim tercihi açık, sistem izni kapalı.'):'Bildirimler şu anda kapalı.'} ${liveConnection.backgroundScheduled?'Arka plan kontrolü planlandı.':''}</p><p>Bağlantı ve izin açıksa yaklaşık 6 saatte bir yeni hareketler kontrol edilir. Android pil ve ağ koşullarına göre geciktirebilir. Her kontrolde en çok 10 aktif gönderi sırayla işlenir. Bu, anlık kurye GPS bildirimi değildir.</p><div class="settings-actions"><button class="btn secondary" data-action="notifications">${icon('bell')} ${enabled?'Bildirimleri kapat':'Bildirimleri aç'}</button><button class="btn ghost" data-action="notification-test">Test bildirimi</button></div>${enabled&&!permission?'<div class="spacer"></div><button class="btn ghost full" data-action="notification-settings">Android bildirim iznini aç</button>':''}</section>
 <section class="settings-card"><h3>${icon('map')} Haritada kargo hareketleri</h3><p>Takip servisinin sağladığı hareket koordinatları gösterilir. Koordinat yoksa yer adıyla haritada arama yapabilirsin. Cihazının konumu istenmez; harita, kuryenin anlık GPS konumu değildir.</p><button class="btn ghost" data-action="nav" data-id="map">Haritayı aç ${icon('arrow')}</button></section>
 <section class="settings-card"><h3>${icon('download')} Yedekle ve geri yükle</h3><p>${state.shipments.length} gönderi · ${state.custom.length} özel firma. Gönderilerini ve tema tercihini JSON olarak yedekle. Dosya takip numaralarını ve yazdığın ek sorgu bilgilerini içerir. API anahtarı ve servis hareket önbelleği yedeğe dahil değildir.</p><div class="settings-actions"><button class="btn secondary" data-action="export">${icon('download')} Dışa aktar</button><button class="btn ghost" data-action="import">${icon('upload')} İçe aktar</button></div></section>
 <section class="settings-card"><h3>${icon('shield')} Verilerin ve kaynaklar</h3><p>Kayıtların cihazında tutulur. Canlı sorguda takip numarası ve girdiğin ek bilgiler 17TRACK’e iletilir. Haritayı açtığında OpenStreetMap harita kareleri yüklenir. Telefonunun konumu toplanmaz.</p><p>${count} doğrulanmış PNG logo çevrimdışı pakete dahil edildi. Vektör kaynaklar yüksek çözünürlükte dönüştürüldü; küçük orijinal görseller büyütülmedi. Doğrulanmış logosu bulunmayan firmalarda harf simgesi korunur.</p></section><div class="version"><b>KargoPilot ${version}</b><br>Taşıyıcı verisi: 17TRACK · Harita: OpenStreetMap<br>Firma hizmetleri ve sorgu kotası hesabına bağlıdır.</div>`;
};
nav=function(){return `<nav class="bottom-nav" aria-label="Ana menü">${[['home','box','Gönderiler'],['map','map','Harita'],['carriers','globe','Firmalar'],['settings','settings','Ayarlar']].map(([id,i,label])=>`<button class="nav-item ${page===id?'active':''}" data-action="nav" data-id="${id}" ${page===id?'aria-current="page"':''}>${icon(i)}<span>${label}</span></button>`).join('')}</nav>`;};
const originalRender=render;
render=function(){if(page==='map'){app.innerHTML=`<main class="page">${header()}${mapPage()}</main>${nav()}`;requestAnimationFrame(()=>drawMap('overview-map',mapLocations()));}else originalRender();applyTheme();};
const originalHome=home;
home=function(){return originalHome().replace('Güncel gönderi bilgilerini firmanın resmî sayfasında sorgularsın.','Canlı bağlantı açıksa hareketlerini burada takip edebilirsin; resmî sorgulama her zaman yanında.');};
shipmentList=function(){
 const list=state.shipments.filter(s=>filter==='archived'?s.archived:!s.archived&&(filter==='delivered'?shipmentDelivered(s):!shipmentDelivered(s))).filter(s=>fold(s.name+' '+s.number+' '+carrierById(s.carrier).name).includes(fold(query))).sort((a,b)=>b.created-a.created);
 if(!list.length)return `<div class="empty">${parcelArt}<h3>${query?'Gönderi bulunamadı':filter==='active'?'İlk paketinle başlayalım':filter==='delivered'?'Teslim edilenler burada':'Arşivin şimdilik boş'}</h3><p>${query?'Başka bir ad veya takip numarasıyla tekrar ara.':filter==='active'?'Takip numaranı ekle, gönderilerini tek yerden kolayca yönet.':filter==='delivered'?'Servisin teslim edildi olarak bildirdiği veya senin teslim işaretlediğin gönderiler burada görünür.':'Arşivlediğin gönderileri bu alanda saklarız.'}</p>${!query&&filter==='active'?`<button class="btn secondary" data-action="add">${icon('plus')} İlk gönderimi ekle</button>`:''}</div>`;
 return list.map(s=>{const c=carrierById(s.carrier),r=getLive(s),label=s.archived?'Arşivde':r?STATUS_LABELS[r.status]:s.status==='delivered'?'Teslim işaretlendi':'Kaydedildi';return `<button class="shipment" data-action="detail" data-id="${s.id}"><div class="shipment-top">${mark(c)}<div class="shipment-info"><h3>${e(s.name)}</h3><p>${e(c.name)}</p></div>${icon('chevron')}</div>${r?`<div class="shipment-live"><strong>${e(STATUS_LABELS[r.status])}</strong>${r.events[0]?' · '+e(r.events[0].location||r.events[0].description):''}${r.error?' · Son kayıt':''}</div>`:''}<div class="shipment-bottom"><span class="tracking-no">${e(s.number)}</span><span class="badge ${s.archived?'archive':shipmentDelivered(s)?'done':''}">${e(label)}</span></div></button>`;}).join('');
};
const originalOpenDetail=openDetail;
function publicTrackingOptions(shipment, officialButton) {
 const carrier = carrierById(shipment.carrier);
 const prefilled = carrier.url.includes('{num}');
 const uses17Track = carrier.id === 'auto' || carrier.id === 'kargomsende';
 const section = document.createElement('section');
 section.className = 'tracking-panel public-tracking';
 section.innerHTML = `<h3>Siteden takip et</h3>
  <p>${prefilled ? 'Takip numarası sorgulama sayfasına aktarılır.' : 'Takip numarası panoya kopyalanır. Açılan sayfaya yapıştırıp sorgula.'}</p>
  <div class="tracking-links"></div>`;
 const links = section.querySelector('.tracking-links');
 links.append(officialButton);
 if (!uses17Track) {
  links.insertAdjacentHTML('beforeend', `<button class="btn ghost full" data-action="public-17track" data-id="${e(shipment.id)}">${icon('external')} 17TRACK’te numarayla sorgula</button>`);
 }
 return section;
}
openDetail=function(id){
 originalOpenDetail(id);const s=shipmentById(id);if(!s)return;const r=getLive(s),busy=refreshing.has(id);
 const content=modalRoot.querySelector('.sheet');const panel=document.createElement('section');panel.className='tracking-panel';
 const officialButton = content.querySelector('[data-action="track"]');
 if (officialButton.nextElementSibling?.matches('.notice')) officialButton.nextElementSibling.remove();
 const publicPanel = publicTrackingOptions(s, officialButton);
 const numberPanel = content.querySelector('.number-panel');
 numberPanel.after(publicPanel);
 if (!liveConnection.configured && !r) {
  publicPanel.insertAdjacentHTML('afterend', `<button class="text-btn" data-action="api-setup">Otomatik takip için API hesabı bağla</button>`);
  return;
 }
 const last=r?.events[0];
 panel.innerHTML=`<div class="tracking-label">17TRACK · TAŞIYICI HAREKETLERİ</div><div class="tracking-status">${icon('truck')}<h3>${r?e(STATUS_LABELS[r.status]):'Henüz canlı sorgu yapılmadı'}</h3></div>${r?.providerName?`<p>Servisin belirlediği taşıyıcı: ${e(r.providerName)}</p>`:''}${last?`<p>${e(last.description)}${last.location?'<br>'+e(last.location):''}</p>`:''}${r?.syncedAt?`<div class="tracking-updated">Son sorgu: ${date(r.syncedAt)}${last?'<br>Hareket zamanı: '+eventDate(last.time):''}</div>`:''}${r?.eta?.from?`<p>Tahmini teslim: ${e(eventDate(r.eta.from))}<br>Kaynak: ${r.eta.source==='Official'?'Taşıyıcı':'17TRACK'}</p>`:''}${r?.error?`<div class="tracking-error" role="alert">${e(r.error)}</div>`:''}${r?.message?`<p>${e(r.message)}</p>`:''}<div class="tracking-toolbar"><button class="btn secondary" data-action="refresh-live" data-id="${id}" ${busy?'disabled':''}><span class="${busy?'refresh-indicator':''}">${icon('refresh')}</span>${busy?'Sorgulanıyor…':'Hareketleri yenile'}</button><button class="btn ghost" data-action="shipment-map" data-id="${id}">${icon('map')} Harita</button></div><p>${liveConnection.configured?'Taşıyıcının sisteme bildirdiği son veri gösterilir; anlık GPS değildir.':'Canlı takip için Ayarlar’dan API anahtarını bağla. Resmî sitede sorgulama anahtarsız kullanılabilir.'}</p>`;
 numberPanel.after(panel);
 if(r){const title=content.querySelector('.detail-carrier + .badge');if(title)title.textContent=STATUS_LABELS[r.status]+' · 17TRACK';}
 if(r?.events.length){const list=document.createElement('section');list.className='movement-list';list.innerHTML=`<h3>Kargo hareketleri</h3>${r.events.map(ev=>`<div class="timeline-event"><span class="timeline-point"></span><div><b>${e(ev.description||'Hareket bilgisi')}</b><small>${e(eventDate(ev.time))}${ev.location?'<br>'+e(ev.location):''}</small></div></div>`).join('')}`;content.querySelector('.timeline').before(list);}
};
const originalRenderAdd=renderAdd;
renderAdd=function(){originalRenderAdd();const d=modal.draft;const fields=document.createElement('details');fields.className='extra-fields';fields.innerHTML=`<summary>Canlı sorgu için ek bilgiler (gerekiyorsa)</summary><p class="small">Bazı firmalar alıcının posta kodunu veya telefonunun son 4 hanesini ister. Yalnızca gerekiyorsa doldur.</p><div class="form-field"><label for="field-postalCode">Alıcı posta kodu</label><input id="field-postalCode" maxlength="20" value="${e(d.postalCode||'')}" autocomplete="off" placeholder="Örn. 34000"></div><div class="form-field"><label for="field-phoneLast4">Telefonun son 4 hanesi</label><input id="field-phoneLast4" maxlength="4" inputmode="numeric" value="${e(d.phoneLast4||'')}" autocomplete="off" placeholder="4 rakam"></div>`;modalRoot.querySelector('.notice').before(fields);};
const originalCaptureDraft=captureDraft;
captureDraft=function(){originalCaptureDraft();if(modal?.type==='add')for(const field of ['postalCode','phoneLast4'])modal.draft[field]=document.querySelector('#field-'+field)?.value.trim()||'';};
const originalSaveShipment=saveShipment;
saveShipment=function(track){captureDraft();if(!/^[A-Za-z0-9 -]{0,20}$/.test(modal.draft.postalCode)||!/^(?:\d{4})?$/.test(modal.draft.phoneLast4)){toast('Posta kodunu ve 4 haneli telefon bilgisini kontrol et.');return;}originalSaveShipment(track);};
function mapLocations(id){
 const records=id?state.shipments.filter(s=>s.id===id):state.shipments.filter(s=>!s.archived);
 const locations=[];for(const s of records){const r=getLive(s);if(!r)continue;const events=id?r.events:r.events.filter(ev=>Number.isFinite(ev.lat)&&Number.isFinite(ev.lon)).slice(0,1);for(const ev of events)if(Number.isFinite(ev.lat)&&Number.isFinite(ev.lon))locations.push({...ev,name:s.name,id:s.id});}
 return locations;
}
function emptyMap(id){const s=id?shipmentById(id):null,r=s?getLive(s):null;const location=r?.events.find(ev=>ev.location)?.location;return `<div class="map-unavailable">${icon('map')}<h3>${location?'Yer adı var, koordinat paylaşılmadı':'Henüz harita noktası yok'}</h3><p>${location?e(location)+' · Bu hareket için kesin koordinat yok. Yer adıyla arama sonucu yaklaşık olabilir.':'Servisten koordinat içeren bir hareket geldiğinde haritada gösterilecek. Rastgele bir konum oluşturulmaz.'}</p>${location?`<button class="btn ghost" data-action="location-search" data-id="${id}">Yer adını haritada ara ${icon('external')}</button>`:!liveConnection.configured?'<button class="btn secondary" data-action="api-setup">Canlı takibi bağla</button>':''}</div>`;}
function mapPage(){const locations=mapLocations();return `<section class="page-heading"><div class="eyebrow" style="color:var(--green)">YOLUN İZİNDE</div><h1>Paketlerinin<br>son durakları.</h1><p>Taşıyıcının bildirdiği son konum kayıtları. Kurye GPS takibi değildir.</p></section>${locations.length?'<div class="map-wrapper"><div id="overview-map" class="map-canvas" role="region" aria-label="Gönderilerin son hareket noktaları"></div><p class="map-caption">Noktaların zamanı gönderi detayındadır. OpenStreetMap harita kareleri internetten yüklenir.</p></div>':emptyMap()}<div class="map-list">${state.shipments.filter(s=>!s.archived).map(s=>`<button class="carrier-row" data-action="shipment-map" data-id="${s.id}">${mark(carrierById(s.carrier))}<div style="flex:1"><h3>${e(s.name)}</h3><p class="small">${e(getLive(s)?.events[0]?.location||'Konum kaydı henüz yok')}</p></div>${icon('chevron')}</button>`).join('')}</div>`;}
function drawMap(element,locations){
 const target=document.getElementById(element);if(!target||!locations.length||!window.L)return;
 if(target._leaflet_id)return;
 const map=L.map(target,{scrollWheelZoom:false,attributionControl:true});
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',referrerPolicy:'strict-origin-when-cross-origin'}).addTo(map);
 locations.forEach((p,i)=>{const marker=L.marker([p.lat,p.lon],{icon:L.divIcon({className:'',html:`<div class="map-pin ${i===0?'latest':''}"></div>`,iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map);const popup=document.createElement('div');popup.textContent=p.name+' · '+(p.location||p.description)+' · '+eventDate(p.time);marker.bindPopup(popup);});
 if(locations.length===1)map.setView([locations[0].lat,locations[0].lon],10);else map.fitBounds(locations.map(p=>[p.lat,p.lon]),{padding:[25,25],maxZoom:11});
 setTimeout(()=>{if(target.isConnected)map.invalidateSize();},0);
}
function openShipmentMap(id){const s=shipmentById(id);if(!s)return;const locations=mapLocations(id);modal={type:'map',id};showSheet(`${sheetHead('Hareket haritası',s.name)}${locations.length?'<div class="map-wrapper"><div id="shipment-map" class="map-canvas" role="region" aria-label="Kargonun bildirilen hareket noktaları"></div><p class="map-caption">Yalnızca koordinat sağlanan kargo hareketleri gösterilir. Noktalar kayıt yeridir; kuryenin anlık GPS konumu değildir.</p></div>':emptyMap(id)}<section class="movement-list">${locations.map(p=>`<div class="timeline-event"><span class="timeline-point"></span><div><b>${e(p.location||p.description)}</b><small>${e(eventDate(p.time))}</small></div></div>`).join('')}</section><button class="btn ghost full" data-action="detail" data-id="${id}">Gönderi detayına dön</button>`);requestAnimationFrame(()=>drawMap('shipment-map',locations));}
function setupAPI(){modal={type:'api'};showSheet(`${sheetHead('Canlı takibi bağla','Kişisel 17TRACK Security Key')}<form id="api-form" novalidate><div class="form-field"><label for="api-key">API anahtarı</label><input class="api-input" id="api-key" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" maxlength="512" placeholder="Security Key"><span id="api-error" class="field-error" role="alert"></span></div><div class="notice">${icon('lock')}<span>Anahtar yalnızca bu cihazda Android Keystore ile şifrelenir. Takip numaraları 17TRACK hesabına kaydedilir; hesabının sorgu kotası kullanılır. Ortak bir uygulama anahtarı APK içinde dağıtılmaz.</span></div><button class="btn full" type="submit">${icon('check')} Bağlantıyı kaydet</button><div class="spacer"></div><button class="btn ghost full" type="button" data-action="api-account">17TRACK API hesabını aç ${icon('external')}</button></form>`);}
function refreshLive(id){if(!liveConnection.configured){setupAPI();return;}if(!nativeMethod('refreshTracking')){toast('Canlı sorgu Android APK içinde kullanılabilir.');return;}if(refreshing.has(id))return;refreshing.add(id);if(!Native.refreshTracking(id)){refreshing.delete(id);toast('Sorgu zaten sürüyor veya gönderi bulunamadı.');}if(modal?.type==='detail'&&modal.id===id)openDetail(id);}
window.receiveTracking=(snapshot,connection)=>{window.liveCache=cleanSnapshots(snapshot);if(connection)liveConnection=connection;const current=modal;render();if(current?.type==='detail')openDetail(current.id);};
window.finishTracking=(id,snapshot,connection)=>{refreshing.delete(id);window.receiveTracking(snapshot,connection);const s=shipmentById(id),r=s?getLive(s):null;if(r?.error)toast(r.error);else if(r)toast(r.events.length?'Kargo hareketleri güncellendi.':r.message||'Henüz kargo hareketi bulunamadı.');};
window.openNotificationShipment=id=>{if(shipmentById(id)){page='home';render();openDetail(id);}};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return;const {action,id}=button.dataset;
 if(action==='theme'){if(commit({...state,preferences:{...state.preferences,theme:id}}))render();}
 else if(action==='api-setup')setupAPI();
 else if(action==='api-account')openURL('https://api.17track.net/');
 else if(action==='api-disconnect')confirmDialog('Canlı bağlantı kaldırılsın mı?','Bu cihazdaki API anahtarı silinir ve arka plan kontrolleri durur. 17TRACK hesabındaki gönderi kayıtları silinmez. Son alınan hareketler cihazda kalır.','Bağlantıyı kaldır',()=>{if(nativeMethod('setTrackingKey')&&Native.setTrackingKey('')){readNativeTracking();closeModal();render();toast('Canlı bağlantı kaldırıldı.');}},()=>closeModal());
 else if(action==='notifications'){if(nativeMethod('setNotifications')){Native.setNotifications(!liveConnection.notificationsEnabled);readNativeTracking();render();}else toast('Bildirimler Android APK içinde kullanılabilir.');}
 else if(action==='notification-test'){if(nativeMethod('testNotification'))Native.testNotification();else toast('Bildirim testi Android APK içinde kullanılabilir.');}
 else if(action==='notification-settings'){if(nativeMethod('notificationSettings'))Native.notificationSettings();}
 else if(action==='refresh-live')refreshLive(id);
 else if(action==='public-17track'){
  const shipment=shipmentById(id);
  if(shipment)openTrackingURL(CARRIERS[0].url.replace('{num}',encodeURIComponent(shipment.number)));
 }
 else if(action==='shipment-map')openShipmentMap(id);
 else if(action==='location-search'){const s=shipmentById(id),location=s?getLive(s)?.events.find(ev=>ev.location)?.location:null;if(location)openURL('https://www.openstreetmap.org/search?query='+encodeURIComponent(location));}
});
document.addEventListener('submit',event=>{if(event.target.id!=='api-form')return;event.preventDefault();const input=document.getElementById('api-key'),key=input.value.trim();if(!/^[A-Za-z0-9._-]{10,512}$/.test(key)){document.getElementById('api-error').textContent='Geçerli Security Key değerini gir.';return;}if(!nativeMethod('setTrackingKey')){document.getElementById('api-error').textContent='Anahtar yalnızca Android APK içinde bağlanabilir.';return;}if(!Native.setTrackingKey(key)){document.getElementById('api-error').textContent='Anahtar güvenli şekilde saklanamadı.';return;}input.value='';readNativeTracking();closeModal();render();toast('Anahtar kaydedildi. Bağlantı ilk gerçek sorguda doğrulanacak.');});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>applyTheme());
readNativeTracking();render();
