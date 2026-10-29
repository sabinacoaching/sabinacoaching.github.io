export function setupComparison({sb,photo,openHouse}){
const $=id=>document.getElementById(id),node=(tag,cls='',content)=>{const x=document.createElement(tag);x.className=cls;if(content!==undefined)x.textContent=content;return x};
const statuses={saved:'Saved',interested:'Interested',viewing_booked:'Viewing booked',viewed:'Viewed',shortlisted:'Shortlisted',rejected:'Rejected'};
const extras=[['area_location','Area / location','text'],['wc_count','Separate WC','number'],['floors','Floors','number'],['floor_area_sqm','Total floor area (m²)','number'],['garden_area_sqm','Garden size (m²)','number'],['garden_description','Garden description','textarea'],['station_name','Nearest station','text'],['station_distance_miles','Station distance (miles)','number'],['station_walk_minutes','Walking time to station (min)','number'],['bus_routes','Bus routes','text'],['bus_travel_minutes','Bus to station (min)','number'],['bus_frequency_am_minutes','Morning bus frequency (min)','number'],['bus_frequency_pm_minutes','Evening bus frequency (min)','number'],['comment_sabina','Sabina comments','textarea'],['comment_david','David comments','textarea'],['latitude','Latitude (map)','number'],['longitude','Longitude (map)','number']];
const nums=new Set(['bedrooms','bathrooms','wc_count','floors','floor_area_sqm','garden_area_sqm','station_distance_miles','station_walk_minutes','bus_travel_minutes','bus_frequency_am_minutes','bus_frequency_pm_minutes','latitude','longitude']);
const labels=['House / link / floor plan','Price','Location','Bedrooms','Bathrooms / WC','Floors','Total floor area (m²)','Garden','Nearest station','Bus to station','Sabina comments','David comments','Viewing status','Viewing date'];
const money=p=>p==null?'—':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(p);
const clean=x=>(x||'House').replace(/^\s*\d+\s+bed(?:room)?s?\s+(?:property|house|flat|apartment)?\s*(?:for sale|to rent)\s*/i,'').replace(/^\s*property\s+for\s+sale/i,'').replace(/\s*[-|]\s*zoopla.*$/i,'').trim();
const mapsUrl=(p,mode)=>'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(clean(p.address)+', UK')+'&destination='+encodeURIComponent(p.station_name+', railway station, UK')+'&travelmode='+mode;
const bar=node('div','hh-views'),tableBtn=node('button','active','Table'),mapBtn=node('button','','Map'),cardsBtn=node('button','','Cards'),notice=node('span','hh-notice','Changes save for both of you.');
bar.append(tableBtn,mapBtn,cardsBtn,notice);
const wrap=node('section','hh-table-shell'),table=node('table','hh-table'),mapPanel=node('section'),mapMsg=node('p','hh-mapmsg','Stations and locations can be edited in the table or house details.'),mapDiv=node('div','hh-map'),missingDiv=node('div','hh-maplist');
wrap.append(table);mapPanel.append(mapMsg,mapDiv,missingDiv);mapPanel.hidden=true;$('cards').before(bar,wrap,mapPanel);
let rows=[],mode='table',L=null,map=null,markers=null;
function flash(msg,fail=false){notice.textContent=msg;notice.style.color=fail?'#af4b45':'#315e50';setTimeout(()=>{notice.textContent='Changes save for both of you.';notice.style.color=''},3000)}
function selectMode(which){mode=which;tableBtn.classList.toggle('active',which==='table');mapBtn.classList.toggle('active',which==='map');cardsBtn.classList.toggle('active',which==='cards');wrap.hidden=which!=='table';mapPanel.hidden=which!=='map';$('cards').style.display=which==='cards'?'':'none';$('empty').hidden=which!=='cards'||!!rows.length;if(which==='map')showMap().catch(e=>{mapMsg.textContent='Map unavailable: '+e.message})}
tableBtn.onclick=()=>selectMode('table');mapBtn.onclick=()=>selectMode('map');cardsBtn.onclick=()=>selectMode('cards');selectMode('table');
function cast(k,v){return nums.has(k)?(v===''?null:Number(v)):v}
async function save(p,key,value,input){const val=cast(key,value);if(nums.has(key)&&val!==null&&!Number.isFinite(val)){flash('Invalid number',true);return}if(String(p[key]??'')===String(val??''))return;const r=await sb.from('properties').update({[key]:val}).eq('id',p.id).select(key).single();if(r.error){flash(r.error.message,true);input?.classList.add('hh-savefail');return}p[key]=val;input?.classList.remove('hh-savefail');flash('Saved')}
function editor(p,key,type='text'){let x=node(type==='textarea'?'textarea':type==='select'?'select':'input');if(type==='select'){for(const [v,label] of Object.entries(statuses)){const opt=node('option','',label);opt.value=v;x.append(opt)}x.value=p[key]||'saved'}else{if(type==='number'){x.type='number';x.step='any';x.min=key==='longitude'?'-9':key==='latitude'?'49':'0'}if(type==='textarea')x.rows=2;x.value=p[key]??''}x.setAttribute('aria-label',key+' '+p.address);let tid;if(type==='textarea'){x.addEventListener('input',()=>{clearTimeout(tid);tid=setTimeout(()=>save(p,key,x.value,x),1000)});x.addEventListener('blur',()=>{clearTimeout(tid);save(p,key,x.value,x)})}else x.addEventListener('change',()=>save(p,key,x.value,x));return x}
const cell=value=>{const t=node('td');if(value instanceof Node)t.append(value);else t.textContent=value;return t};
function render(list){
rows=list;
const head=node('thead'),hr=node('tr');
for(const h of labels)hr.append(node('th','',h));
head.append(hr);
const body=node('tbody');
const stacked=(blocks)=>{
const holder=node('div','hh-stack');
for(const [label,child] of blocks){const group=node('label','hh-field');group.append(node('span','hh-mini',label),child);holder.append(group)}
return holder};
for(const p of list){
const tr=node('tr');
const house=node('div','hh-house'),im=node('img');
im.alt='House';im.loading='lazy';photo((p.images||[])[0]).then(u=>{if(u)im.src=u});
const namebox=node('div'),title=node('button','',clean(p.address||p.title));
title.onclick=()=>openHouse(p);
namebox.append(title);
const source=node('small','',p.source||'');namebox.append(source);
const link=node('a','hh-original','Listing ↗');link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';namebox.append(link);
if((p.floorplans||[]).length){
const floor=node('button','hh-floorlink','Floor plan ↗');floor.onclick=()=>openHouse(p);namebox.append(floor)}
else{namebox.append(node('small','','Floor plan not available'))}
house.append(im,namebox);tr.append(cell(house));
const price=cell(money(p.price));price.classList.add('hh-price');tr.append(price);
tr.append(cell(editor(p,'area_location')));
tr.append(cell(editor(p,'bedrooms','number')));
tr.append(cell(stacked([['Bathroom',editor(p,'bathrooms','number')],['Separate WC',editor(p,'wc_count','number')]])));
tr.append(cell(editor(p,'floors','number')));
tr.append(cell(editor(p,'floor_area_sqm','number')));
tr.append(cell(stacked([['Size (m²)',editor(p,'garden_area_sqm','number')],['Description',editor(p,'garden_description','textarea')]])));
const station=stacked([['Station',editor(p,'station_name')],['Walk (min)',editor(p,'station_walk_minutes','number')],['Distance (miles)',editor(p,'station_distance_miles','number')]]);
if(p.station_name){const g=node('a','hh-maps','Check Google Maps ↗');g.href=mapsUrl(p,'walking');g.target='_blank';g.rel='noopener noreferrer';station.append(g)}
tr.append(cell(station));
const bus=stacked([['Routes',editor(p,'bus_routes')],['Journey to station (min)',editor(p,'bus_travel_minutes','number')],['Morning frequency (min)',editor(p,'bus_frequency_am_minutes','number')],['Evening frequency (min)',editor(p,'bus_frequency_pm_minutes','number')]]);
if(p.bus_frequency_minutes!=null&&p.bus_frequency_am_minutes==null&&p.bus_frequency_pm_minutes==null){bus.append(node('small','hh-oldfrequency','Previous frequency: every '+p.bus_frequency_minutes+' min (time unspecified)'))}
tr.append(cell(bus));
tr.append(cell(editor(p,'comment_sabina','textarea')));
tr.append(cell(editor(p,'comment_david','textarea')));
tr.append(cell(editor(p,'status','select')));
const view=node('input');view.type='datetime-local';view.value=p.viewing_at?p.viewing_at.slice(0,16):'';
view.setAttribute('aria-label','Viewing date for '+(p.address||p.title));
view.onchange=async()=>{const val=view.value?new Date(view.value).toISOString():null;const r=await sb.from('properties').update({viewing_at:val}).eq('id',p.id);if(r.error)flash(r.error.message,true);else{p.viewing_at=val;flash('Saved')}};
tr.append(cell(view));
if(tr.cells.length!==labels.length)throw Error('Comparison table columns mismatch');
body.append(tr);
}
table.replaceChildren(head,body);
$('empty').hidden=!!rows.length;
if(mode==='map')redraw()
}
const detail=node('section','hh-aux'),detailGrid=node('div','hh-auxgrid'),controls={};detail.append(node('h3','','Comparison details'),node('p','hh-help','These are shared fields. Press Save changes below.'),detailGrid);
for(const [key,label,type] of extras){const l=node('label',type==='textarea'?'wide':'');l.append(document.createTextNode(label));const x=node(type==='textarea'?'textarea':'input');if(type==='textarea')x.rows=2;else{x.type=type;if(type==='number')x.step='any'}l.append(x);controls[key]=x;detailGrid.append(l)}
$('dialog').querySelector('.actions').before(detail);
const floorPanel=node('section','hh-planbox'),floorContents=node('div');floorPanel.append(node('h3','','Floor plans'),floorContents);$('detailFacts').before(floorPanel);
async function open(p){for(const [key] of extras)controls[key].value=p[key]??'';floorContents.replaceChildren();if(!(p.floorplans||[]).length){floorContents.append(node('p','hh-help','Floor plan not stored yet. Re-import details using the updated importer.'));return}
for(const f of p.floorplans){const u=await photo(f);if(!u)continue;if(/\.pdf(?:\?|$)/i.test(f.path||f.url||'')){const a=node('a','','Open floor plan PDF ↗');a.href=u;a.target='_blank';a.rel='noopener noreferrer';floorContents.append(a)}else{const image=node('img');image.src=u;image.alt='Floor plan';floorContents.append(image)}}}
function edited(){const o={};for(const [key] of extras)o[key]=cast(key,controls[key].value);return o}
async function postcodeLocate(p){const a=p.address||p.title||'',full=a.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i),out=a.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\b/i);if(!full&&!out)return false;const url=full?'https://api.postcodes.io/postcodes/'+encodeURIComponent(full[1].replace(/\s/g,'')):'https://api.postcodes.io/outcodes/'+encodeURIComponent(out[1]);const r=await fetch(url);if(!r.ok)return false;const j=await r.json(),v=j.result;if(!v||!Number.isFinite(v.latitude)||!Number.isFinite(v.longitude))return false;const saveResult=await sb.from('properties').update({latitude:v.latitude,longitude:v.longitude}).eq('id',p.id);if(saveResult.error)throw saveResult.error;p.latitude=v.latitude;p.longitude=v.longitude;return true}
async function showMap(){if(!L){const mod=await import('https://esm.sh/leaflet@1.9.4');L=mod.default||mod}if(!map){map=L.map(mapDiv).setView([51.466,-.31],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);markers=L.layerGroup().addTo(map)}setTimeout(()=>map.invalidateSize(),200);redraw()}
function redraw(){if(!map||!markers)return;markers.clearLayers();missingDiv.replaceChildren();const groups=new Map(),miss=[],bounds=[];for(const p of rows){if(p.latitude==null||p.longitude==null||!Number.isFinite(Number(p.latitude))||!Number.isFinite(Number(p.longitude))){miss.push(p);continue}const point=[Number(p.latitude),Number(p.longitude)];if(point[0]<49||point[0]>61||point[1]<-9||point[1]>3){miss.push(p);continue}const k=point.join(',');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}
for(const g of groups.values()){const coord=[Number(g[0].latitude),Number(g[0].longitude)];bounds.push(coord);const popup=node('div');popup.append(node('strong','',g.length>1?g.length+' houses at approximate postcode location':clean(g[0].address)));for(const p of g){const b=node('button','',clean(p.address)+' · '+money(p.price));b.style.display='block';b.style.marginTop='5px';b.onclick=()=>openHouse(p);popup.append(b)}L.marker(coord).addTo(markers).bindPopup(popup)}
if(bounds.length===1)map.setView(bounds[0],14);else if(bounds.length>1)map.fitBounds(bounds,{padding:[36,36],maxZoom:14});mapMsg.textContent=groups.size+' positions for '+rows.length+' houses. Postcode positions are approximate. Edit coordinates in property details for exact placement.';
if(miss.length){missingDiv.append(node('span','hh-help',miss.length+' without map coordinates: '));for(const p of miss){const b=node('button','',clean(p.address)+' · Locate');b.onclick=async()=>{b.disabled=true;try{if(await postcodeLocate(p)){flash('Postcode located');redraw()}else{b.disabled=false;b.textContent='Postcode unavailable'}}catch(e){b.disabled=false;flash(e.message,true)}};missingDiv.append(b)}}}
return {render,open,edited};
}