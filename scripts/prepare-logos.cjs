// Downloads real carrier artwork. Vectors are rasterized; small bitmaps are never enlarged.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const dest=path.resolve(__dirname,'../app/src/main/assets/logos');fs.mkdirSync(dest,{recursive:true});
const sources={
 auto:'https://www.17track.net/assets/logo-full.svg',
 yurtici:'https://cdn.brandfetch.io/idBcrY2d6L/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1760552856137',
 agt:'https://static.wixstatic.com/media/71a161_0fa9a77fe7ca43fba9d0ce79ac0dffc2~mv2_d_9274_3081_s_4_2.png',
 borusan:'https://upload.wikimedia.org/wikipedia/commons/d/d3/Logo_of_CEVA_Logistics_%282023%29.svg',
 aras:'https://www.araskargo.com.tr/aras-nav-logo.svg',
 mng:'https://www.dhlecommerce.com.tr/assets/sprite/dhl_logo_red.svg',
 dhl:'https://www.dhl.com/content/dam/dhl/global/core/images/logos/dhl-logo.svg',
 surat:'https://www.suratkargo.com.tr/KargoTakip/Images/logo.png',
 hepsijet:'https://www.hepsijet.com/images/hepsijet.svg',
 kolay:'https://www.kolaygelsin.com/assets/icons/kg-logo.svg',
 kargoist:'https://kargoist.com/wp-content/uploads/2026/03/kargoist_logo.png',
 kuryenet:'https://www.kuryenet.com.tr/content/media/logo.svg',
 birgunde:'https://birgundekargo.com/App_Themes/BirGundeKargo/assets/images/birgundekargo-logo02.png',
 horoz:'https://www.horoz.com.tr/_assets/images/logo/horoz-logo-color.svg',
 fillo:'https://www.fillo.com.tr/img/fillo-logo.svg',
 netlog:'https://static.wixstatic.com/media/ce499c_2cb0b2cce19441239d37b0db0a7cbada~mv2.png',
 fedex:'https://www.fedex.com/content/dam/fedex-com/logos/logo.png',
 dpd:'https://www.dpd.com/wp-content/themes/DPD_NoLogin/images/DPD_logo_redgrad_rgb_responsive.svg',
 royalmail:'https://www.royalmail.com/themes/custom/rmlcwr/dualrmglogo.svg',
 tnt:'https://www.tnt.com/dam/campaign/iccampaign/logo-ipfs-2-01.svg',
 posteitaliane:'https://www.poste.it/risorse_dt/condivise/immagini/loghi/logo-poste-italiane@2x.png',
 sf:'https://www.sf-international.com/nuxt/_nuxt/img/logo-chinese-express.275d17f.png'
};
const wiki={yurtici:'Yurtiçi Kargo',ptt:'PTT (Turkey)',agt:'AGT Kurye',borusan:'CEVA Logistics',ups:'United Parcel Service',usps:'United States Postal Service',gls:'GLS Group',laposte:'La Poste (France)',postnl:'PostNL',bpost:'Bpost',canadapost:'Canada Post',auspost:'Australia Post',swisspost:'Swiss Post',cainiao:'Cainiao',yunexpress:'YunExpress',kargomsende:'Kargomsende'};
const manifest=fs.existsSync(path.join(dest,'sources.json'))?JSON.parse(fs.readFileSync(path.join(dest,'sources.json'),'utf8')):{};
delete manifest.trendyol; // Group artwork is not the distinct Express carrier logo.
async function download(id,url){
 if(manifest[id]&&process.argv[2]!=='--refresh')return;
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 KargoPilotArtwork/1.1','Referer':new URL(url).origin+'/'}});if(!response.ok)throw Error('HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>16000000)throw Error('Too large');
  const meta=await sharp(bytes).metadata();const vector=meta.format==='svg';
  let image=vector?sharp(bytes,{density:400}):sharp(bytes);
  await image.resize({width:1024,height:512,fit:'inside',withoutEnlargement:!vector}).png().toFile(path.join(dest,id+'.png'));
  const png=await sharp(path.join(dest,id+'.png')).metadata();
  manifest[id]={file:'logos/'+id+'.png',source:url,sourceFormat:meta.format,sourceWidth:meta.width,sourceHeight:meta.height,width:png.width,height:png.height};
  console.log(id,png.width+'x'+png.height,vector?'vector':'original raster');
 }catch(error){console.log(id,'unavailable:',error.message);}
}
(async()=>{
 let cursor=0,entries=Object.entries(sources);await Promise.all(Array.from({length:6},async()=>{while(cursor<entries.length){const [id,url]=entries[cursor++];await download(id,url);}}));
 // Wikipedia original artwork is used only when no first-party asset has been located.
 try{
  const titles=Object.values(wiki).join('|');
  const response=await fetch('https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original&redirects=1&format=json&titles='+encodeURIComponent(titles),{signal:AbortSignal.timeout(15000)});
  const data=await response.json();const pages=Object.values(data.query?.pages||{});
  for(const [id,title]of Object.entries(wiki)){if(manifest[id])continue;const page=pages.find(p=>p.title?.toLowerCase()===title.toLowerCase());if(page?.original?.source&&/logo|icon/i.test(page.original.source))await download(id,page.original.source);}
 }catch(error){console.log('Wikipedia source unavailable:',error.message);}
 fs.writeFileSync(path.join(dest,'sources.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(dest,'../brand-assets.js'),'window.BRAND_ASSETS='+JSON.stringify(manifest)+';\n');
 console.log('Prepared',Object.keys(manifest).length,'real PNG logos.');
})();
