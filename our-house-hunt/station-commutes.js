// One Google Maps walking link, and walking/PT minutes for each named station.
// New houses are calculated once on the server and saved as google_routes.
export function setupStationAccess({sb}){
 const el=(tag,css='',txt='')=>{const e=document.createElement(tag);e.className=css;e.textContent=txt;return e};
 const names=p=>[p.station_name||'',p.station_2_name||''];
 const views=new Map(),queue=[],pending=new Set(),attempted=new Set();
 let processing=false,googleUnavailable=false;
 const name=(p,i)=>String(names(p)[i]||'').trim();
 function stationName(raw){
  if(/tram/i.test(raw))return raw.replace(/\s*(?:tram\s*)?stop$/i,'')+' Tram Stop, London, UK';
  if(/underground|tube/i.test(raw)||/^Ealing Common$/i.test(raw))return raw.replace(/\s*underground$/i,'')+' Underground Station, London, UK';
  return raw.replace(/\s*(?:railway|rail|train|station)$/i,'')+' Railway Station, London, UK';
 }
 function googleLink(p,i){
  const origin=p.address?.trim()?p.address+', United Kingdom':p.latitude+','+p.longitude;
  return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin,destination:stationName(name(p,i)),travelmode:'walking'}).toString();
 }
 function cachedGoogle(p,i){
  const c=p.station_commutes?.google_routes;
  if(!c?.complete||c.origin!==p.address||JSON.stringify(c.stations)!==JSON.stringify(names(p)))return null;
  return c.results?.[i]||null;
 }
 function render(p,i){
  const v=views.get(p.id+':'+i);if(!v)return;
  const c=cachedGoogle(p,i),old=p.station_commutes?.results?.[i]||{};
  const override=p.station_commutes?.google_verified?.[name(p,i)]||{};
  const rawMiles=p[i===0?'station_distance_miles':'station_2_distance_miles'];
  const miles=c?.walking_miles??override.walking_miles??old.google_walking?.miles??rawMiles;
  const minutes=c?.walking_minutes??override.walking_minutes??old.google_walking?.minutes;
  v.walk.textContent='Walking: '+(miles!=null?(c||override.walking_miles!=null||old.google_walking?.miles!=null?'':'≈')+Number(miles).toFixed(2)+' mi':'—')+(minutes!=null?' / '+Math.round(minutes)+' min':'');
  v.link.href=googleLink(p,i);
  const pt=c?.pt_minutes??override.pt_minutes??old.avg_minutes;
  v.pt.textContent='PT: '+(pt==null?'—':(c||override.pt_minutes!=null?'':'~')+Math.round(pt)+' min');
  v.pt.title=c?'Google Maps Routes API: five Tuesday departures 07:30–17:30':override.pt_minutes!=null?'Google Maps user-verified time':old.avg_minutes!=null?'Previously saved TfL travel time':'No verified travel time';
 }
 async function drain(){
  if(processing||googleUnavailable)return;
  processing=true;
  while(queue.length){
   const p=queue.shift();pending.delete(p.id);
   if(attempted.has(p.id))continue;attempted.add(p.id);
   try{
    const r=await sb.functions.invoke('house-hunt-google-routes',{body:{id:p.id}});
    if(r.error)throw r.error;
    if(!r.data?.google_routes?.complete)throw Error(r.data?.error||'No Google Routes result');
    p.station_commutes={...(p.station_commutes||{}),google_routes:r.data.google_routes};
    render(p,0);render(p,1);
   }catch(e){
    const desc=String(e?.message||e);
    console.warn('Google routing not ready for '+p.address,desc);
    // No repeated calls or automatic estimates from mixed providers when credentials are missing.
    if(/non-2xx|google_api_key_not_configured|503/i.test(desc)){
     googleUnavailable=true;queue.length=0;
    }
   }
   await new Promise(done=>setTimeout(done,1200));
  }
  processing=false;
 }
 function attach(p,i){
  const box=el('div','hh-station-access'),walk=el('div','hh-station-walk'),
    link=el('a','hh-station-google','Google Maps walking ↗'),pt=el('div','hh-station-pt');
  link.target='_blank';link.rel='noopener noreferrer';
  box.append(walk,link,pt);
  views.set(p.id+':'+i,{walk,link,pt});render(p,i);
  if(!googleUnavailable&&!cachedGoogle(p,i)&&p.address&&names(p).every(Boolean)&&!pending.has(p.id)&&!attempted.has(p.id)){
   pending.add(p.id);queue.push(p);void drain();
  }
  return box;
 }
 return {attach};
}
