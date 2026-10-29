export function setupComparison({sb,photo,openHouse}){
const $=id=>document.getElementById(id),node=(tag,cls='',content)=>{const x=document.createElement(tag);x.className=cls;if(content!==undefined)x.textContent=content;return x};
const statuses={saved:'Saved',interested:'Interested',viewing_booked:'Viewing booked',viewed:'Viewed',shortlisted:'Shortlisted',rejected:'Rejected',under_offer_sold:'Under offer / Sold'};
const labels=['House','Price','Bedrooms','Bathrooms / WC','Floors','Total floor area','Garden','Nearest station','Sabina comments','David comments','Viewing status','Viewing date'];
const extras=[['wc_count','Separate WC','number'],['floors','Floors','number'],['floor_area_sqm','Floor area (m²)','number'],['garden_area_sqm','Garden area (m²)','number'],['garden_description','Garden description','textarea'],['station_name','Nearest station 1','text'],['station_distance_miles','Walking distance 1 (miles)','number'],['station_2_name','Nearest station 2','text'],['station_2_distance_miles','Walking distance 2 (miles)','number'],['comment_sabina','Sabina comments','textarea'],['comment_david','David comments','textarea']];
const nums=new Set(['bedrooms','bathrooms','wc_count','floors','floor_area_sqm','garden_area_sqm','station_distance_miles','station_2_distance_miles']);
const money=p=>p==null?'—':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(p);
const clean=x=>String(x||'House').replace(/^\s*\d+\s*bed(?:room)?s?\s+.*?\s+(?:for sale|to rent)\s*/i,'').replace(/^\s*property\s+for\s+sale\s*/i,'').replace(/\s*[-|]\s*zoopla.*$/i,'').replace(/\s*[-|]\s*rightmove.*$/i,'').replace(/,\s*(?:[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}|[A-Z]{1,2}\d[A-Z\d]?)$/i,'').replace(/\s+(?:[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}|[A-Z]{1,2}\d[A-Z\d]?)$/i,'').trim();
const bar=node('div','hh-views'),tableBtn=node('button','active','Table'),mapBtn=node('button','','Map'),cardsBtn=node('button','','Cards'),notice=node('span','hh-notice','Changes save for both of you.');
bar.append(tableBtn,mapBtn,cardsBtn,notice);
const wrap=node('section','hh-table-shell'),table=node('table','hh-table'),mapPanel=node('section'),mapMsg=node('p','hh-mapmsg','Map shows approximate positions when coordinates are available.'),mapDiv=node('div','hh-map'),missingDiv=node('div','hh-maplist');
wrap.append(table);mapPanel.append(mapMsg,mapDiv,missingDiv);mapPanel.hidden=true;$('cards').before(bar,wrap,mapPanel);
let rows=[],mode='table',L=null,map=null,markers=null;
function flash(msg,fail=false){notice.textContent=msg;notice.style.color=fail?'#af4b45':'#315e50';setTimeout(()=>{notice.textContent='Changes save for both of you.';notice.style.color=''},3000)}
function selectMode(which){mode=which;tableBtn.classList.toggle('active',which==='table');mapBtn.classList.toggle('active',which==='map');cardsBtn.classList.toggle('active',which==='cards');wrap.hidden=which!=='table';mapPanel.hidden=which!=='map';$('cards').style.display=which==='cards'?'':'none';$('empty').hidden=which!=='cards'||!!rows.length;if(which==='map')showMap().catch(e=>{mapMsg.textContent='Map unavailable: '+e.message})}
tableBtn.onclick=()=>selectMode('table');mapBtn.onclick=()=>selectMode('map');cardsBtn.onclick=()=>selectMode('cards');selectMode('table');
function cast(k,v){return nums.has(k)?(v===''?null:Number(v)):v}
async function save(p,key,value,input){const val=cast(key,value);if(nums.has(key)&&val!==null&&!Number.isFinite(val)){flash('Invalid number',true);return}if(String(p[key]??'')===String(val??''))return;const r=await sb.from('properties').update({[key]:val}).eq('id',p.id).select(key).single();if(r.error){flash(r.error.message,true);input?.classList.add('hh-savefail');return}p[key]=val;input?.classList.remove('hh-savefail');flash('Saved')}
function editor(p,key,type='text'){let x=node(type==='textarea'?'textarea':type==='select'?'select':'input');if(type==='select'){for(const [v,label] of Object.entries(statuses)){const opt=node('option','',label);opt.value=v;x.append(opt)}x.value=p[key]||'saved'}else{if(type==='number'){x.type='number';x.step='any';x.min='0'}if(type==='textarea')x.rows=3;x.value=p[key]??''}x.setAttribute('aria-label',key+' '+p.address);let tid;if(type==='textarea'){x.addEventListener('input',()=>{clearTimeout(tid);tid=setTimeout(()=>save(p,key,x.value,x),800)});x.addEventListener('blur',()=>{clearTimeout(tid);save(p,key,x.value,x)})}else x.addEventListener('change',()=>save(p,key,x.value,x));return x}
const cell=value=>{const t=node('td');if(value instanceof Node)t.append(value);else t.textContent=value;return t};
const val=v=>v==null||v===''?'—':String(v);

const imageHashes=new Map();
async function imageFingerprint(url){
 if(imageHashes.has(url))return imageHashes.get(url);
 const task=(async()=>{
  const image=new Image();image.crossOrigin='anonymous';image.decoding='async';image.src=url;await image.decode();
  if(image.naturalWidth<100||image.naturalHeight<75)return {skip:true};
  let hash=null;
  try{
   const canvas=document.createElement('canvas');canvas.width=9;canvas.height=8;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,9,8);
   const rgba=ctx.getImageData(0,0,9,8).data;
   const pixels=[];for(let i=0;i<rgba.length;i+=4)pixels.push(rgba[i]*.3+rgba[i+1]*.59+rgba[i+2]*.11);
   hash=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)hash.push(pixels[y*9+x]>pixels[y*9+x+1]?1:0);
  }catch(e){/* storage CORS unavailable: retain image with no fingerprint */}
  return {hash};
 })();
 imageHashes.set(url,task);return task;
}
const dist=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
async function distinctPhotos(p,container){
 const selected=[];
 for(const src of (p.images||[])){
  if(selected.length===4)break;
  const url=await photo(src);if(!url)continue;
  let candidate;
  try{candidate=await imageFingerprint(url)}catch{candidate={hash:null}}
  if(candidate.skip)continue;
  if(candidate.hash&&selected.some(s=>s.hash&&dist(candidate.hash,s.hash)<=7))continue;
  selected.push({url,hash:candidate.hash});
  const img=node('img','hh-photo'+(selected.length===1?' hh-photo-main':''));
  img.alt='Property photograph '+selected.length;img.loading='lazy';img.src=url;img.onclick=()=>openHouse(p);container.append(img);
 }
 if(!selected.length&&container.isConnected)container.append(node('div','hh-photo-unavailable','No photos'));
}
function labelledEditor(p,label,key,type='text'){
 const box=node('label','hh-field');
 box.append(node('span','hh-mini',label),editor(p,key,type));
 return box;
}

function render(list){
 rows=list;
 const head=node('thead'),hr=node('tr');for(const h of labels)hr.append(node('th','',h));head.append(hr);
 const body=node('tbody');
 for(const p of list){
  const tr=node('tr');
  const house=node('div','hh-house'),photos=node('div','hh-photo-grid');
  distinctPhotos(p,photos).catch(e=>console.warn('Photo gallery',e));
  const address=node('div','hh-address',clean(p.address||p.title));
  address.contentEditable='true';address.setAttribute('role','textbox');address.setAttribute('aria-label','Property address, editable');
  address.spellcheck=false;address.title='Edit property address';
  address.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();address.blur()}});
  address.addEventListener('blur',()=>save(p,'address',address.textContent.trim(),address));
  const link=node('a','hh-original','Listing ↗');link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';
  house.append(photos,address,link);
  tr.append(cell(house));
  const price=labelledEditor(p,'£','price','number');price.classList.add('hh-price-editor');tr.append(cell(price));
  tr.append(cell(editor(p,'bedrooms','number')));
  const bath=node('div','hh-stack');
  bath.append(labelledEditor(p,'Bathrooms','bathrooms','number'),labelledEditor(p,'Separate WC','wc_count','number'));
  tr.append(cell(bath));
  tr.append(cell(editor(p,'floors','number')));
  const floorArea=node('div','hh-stack');floorArea.append(labelledEditor(p,'m²','floor_area_sqm','number'));
  if((p.floorplans||[]).length){
    const plan=node('a','hh-plan-link','Floor plan ↗');plan.href='#';plan.target='_blank';plan.rel='noopener noreferrer';plan.title='Open the original floor plan';
    photo(p.floorplans[0]).then(u=>{if(u)plan.href=u}).catch(()=>{});
    plan.addEventListener('click',e=>{if(plan.getAttribute('href')==='#'){e.preventDefault();openHouse(p)}});
    floorArea.append(plan);
  }
  tr.append(cell(floorArea));
  const garden=node('div','hh-stack');
  garden.append(labelledEditor(p,'Size (m²)','garden_area_sqm','number'),labelledEditor(p,'Description','garden_description','textarea'));
  tr.append(cell(garden));
  const station=node('div','hh-stack');
  station.append(labelledEditor(p,'Station 1','station_name'),labelledEditor(p,'Walking miles','station_distance_miles','number'));
  station.append(labelledEditor(p,'Station 2','station_2_name'),labelledEditor(p,'Walking miles','station_2_distance_miles','number'));
  tr.append(cell(station));
  tr.append(cell(editor(p,'comment_sabina','textarea')));
  tr.append(cell(editor(p,'comment_david','textarea')));
  tr.append(cell(editor(p,'status','select')));
  const view=node('input');view.type='datetime-local';view.value=p.viewing_at?p.viewing_at.slice(0,16):'';view.setAttribute('aria-label','Viewing date '+(p.address||p.title));view.onchange=async()=>{const v=view.value?new Date(view.value).toISOString():null;const r=await sb.from('properties').update({viewing_at:v}).eq('id',p.id);if(r.error)flash(r.error.message,true);else{p.viewing_at=v;flash('Saved')}};tr.append(cell(view));
  if(tr.cells.length!==labels.length)throw Error('Comparison column count mismatch');
  body.append(tr);
 }
 table.replaceChildren(head,body);
 $('empty').hidden=!!rows.length;
 if(mode==='map')redraw();
}
const detail=node('section','hh-aux'),detailGrid=node('div','hh-auxgrid'),controls={};
detail.append(node('h3','','Property details'),detailGrid);
for(const [key,label,type] of extras){const l=node('label',type==='textarea'?'wide':'');l.append(document.createTextNode(label));const x=node(type==='textarea'?'textarea':'input');if(type==='textarea')x.rows=2;else{x.type=type;if(type==='number')x.step='any'}l.append(x);controls[key]=x;detailGrid.append(l)}
$('dialog').querySelector('.actions').before(detail);
const floorPanel=node('section','hh-planbox'),floorContents=node('div');floorPanel.append(node('h3','','Floor plans'),floorContents);$('detailFacts').before(floorPanel);
async function open(p){for(const [key] of extras)controls[key].value=p[key]??'';floorContents.replaceChildren();if(!(p.floorplans||[]).length){floorPanel.hidden=true;return}floorPanel.hidden=false;
for(const f of p.floorplans){const u=await photo(f);if(!u)continue;if(/\.pdf(?:\?|$)/i.test(f.path||f.url||'')){const a=node('a','','Open floor plan ↗');a.href=u;a.target='_blank';a.rel='noopener noreferrer';floorContents.append(a)}else{const image=node('img');image.src=u;image.alt='Floor plan';floorContents.append(image)}}}
function edited(){const o={};for(const [key] of extras)o[key]=cast(key,controls[key].value);return o}
async function postcodeLocate(p){const a=p.address||p.title||'',full=a.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i),out=a.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\b/i);if(!full&&!out)return false;const url=full?'https://api.postcodes.io/postcodes/'+encodeURIComponent(full[1].replace(/\s/g,'')):'https://api.postcodes.io/outcodes/'+encodeURIComponent(out[1]);const r=await fetch(url);if(!r.ok)return false;const j=await r.json(),v=j.result;if(!v||!Number.isFinite(v.latitude)||!Number.isFinite(v.longitude))return false;const saveResult=await sb.from('properties').update({latitude:v.latitude,longitude:v.longitude}).eq('id',p.id);if(saveResult.error)throw saveResult.error;p.latitude=v.latitude;p.longitude=v.longitude;return true}
async function showMap(){if(!L){const mod=await import('https://esm.sh/leaflet@1.9.4');L=mod.default||mod}if(!map){map=L.map(mapDiv).setView([51.466,-.31],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);markers=L.layerGroup().addTo(map)}setTimeout(()=>map.invalidateSize(),200);redraw()}
function redraw(){if(!map||!markers)return;markers.clearLayers();missingDiv.replaceChildren();const groups=new Map(),miss=[],bounds=[];for(const p of rows){if(p.latitude==null||p.longitude==null||!Number.isFinite(Number(p.latitude))||!Number.isFinite(Number(p.longitude))){miss.push(p);continue}const point=[Number(p.latitude),Number(p.longitude)];if(point[0]<49||point[0]>61||point[1]<-9||point[1]>3){miss.push(p);continue}const k=point.join(',');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}
for(const g of groups.values()){const coord=[Number(g[0].latitude),Number(g[0].longitude)];bounds.push(coord);const popup=node('div');popup.append(node('strong','',g.length>1?g.length+' houses at approximate postcode location':clean(g[0].address)));for(const p of g){const b=node('button','',clean(p.address)+' · '+money(p.price));b.style.display='block';b.style.marginTop='5px';b.onclick=()=>openHouse(p);popup.append(b)}L.marker(coord).addTo(markers).bindPopup(popup)}
if(bounds.length===1)map.setView(bounds[0],14);else if(bounds.length>1)map.fitBounds(bounds,{padding:[36,36],maxZoom:14});mapMsg.textContent=groups.size+' map positions for '+rows.length+' houses. Source listing pins may be approximate.';
if(miss.length){missingDiv.append(node('span','hh-help',miss.length+' without map coordinates: '));for(const p of miss){const b=node('button','',clean(p.address)+' · Locate');b.onclick=async()=>{b.disabled=true;try{if(await postcodeLocate(p)){flash('Postcode located');redraw()}else{b.disabled=false;b.textContent='Postcode unavailable'}}catch(e){b.disabled=false;flash(e.message,true)}};missingDiv.append(b)}}}
return {render,open,edited};
}
