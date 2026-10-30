// Station times are calculated once by TfL and saved in the property record.
// A single walking link opens Google Maps with the destination's station name.
export function setupStationAccess({sb}){
 const queue=[],pending=new Set(),attempted=new Set(),views=new Map();let working=false;
 const el=(tag,cls='',content='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=content;return e};
 const names=p=>[String(p.station_name||'').trim(),String(p.station_2_name||'').trim()];
 const coords=p=>p.latitude+','+p.longitude;
 function destination(name){
  if(/tram/i.test(name))return name.replace(/\s*(?:tram\s*)?stop$/i,'')+' Tram Stop, London, UK';
  if(/underground|tube/i.test(name)||name==='Ealing Common')return name.replace(/\s*underground$/i,'')+' Underground Station, London, UK';
  return name.replace(/\s*(?:railway|rail|train|station)$/i,'')+' Railway Station, London, UK';
 }
 function mapUrl(p,i){
  const origin=p.address?.trim()?p.address+', United Kingdom':coords(p);
  return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin,destination:destination(names(p)[i]),travelmode:'walking'}).toString();
 }
 function completed(p){
  const q=p.station_commutes?.tfl_final;
  return !!(q?.complete&&q.origin===coords(p)&&JSON.stringify(q.names)===JSON.stringify(names(p)));
 }
 function render(p,i){
  const v=views.get(p.id+':'+i);if(!v)return;
  const c=p.station_commutes||{},r=c.results?.[i]||{},t=completed(p)?c.tfl_final.results?.[i]:null,override=c.google_verified?.[names(p)[i]]||{};
  const google=c.google_routes?.complete&&c.google_routes?.origin===p.address&&c.google_routes?.stations?.[i]===names(p)[i]?c.google_routes.results[i]:null;
  const mi=override.walking_miles??google?.walking_miles??t?.walking_miles??r.walking_miles??r.google_walking?.miles??p[i===0?'station_distance_miles':'station_2_distance_miles'];
  const mins=override.walking_minutes??google?.walking_minutes??t?.walking_minutes??r.walking_minutes??r.google_walking?.minutes??r.walking_estimate?.minutes??(mi!=null?Math.round(Number(mi)*20):null);
  const approxMiles=google?.walking_miles==null&&override.walking_miles==null&&t?.walking_miles==null&&r.walking_miles==null&&r.google_walking?.miles==null;
  const approxMins=google?.walking_minutes==null&&override.walking_minutes==null&&t?.walking_minutes==null&&r.walking_minutes==null&&r.google_walking?.minutes==null;
  v.walk.textContent='Walking: '+(mi!=null?(approxMiles?'~':'')+Number(mi).toFixed(2)+' mi':'—')+(mins!=null?' / '+(approxMins?'~':'')+Math.round(mins)+' min':'');
  v.link.href=mapUrl(p,i);
  const pt=override.pt_minutes??google?.pt_minutes??t?.avg_minutes??r.avg_minutes;
  v.pt.textContent='PT: '+(pt!=null?(google?.pt_minutes!=null||override.pt_minutes!=null?'':'~')+Math.round(pt)+' min':t?'no PT route':'—');
  v.pt.title=override.pt_minutes!=null?(override.source==='manual'?'Manually entered time':'User-verified time'):google?.pt_minutes!=null?'Google Routes API':t?'TfL five Tuesday departures':r.avg_minutes!=null?'Previous TfL saved time':'No timetable route';
 }
 async function drain(){
  if(working)return;working=true;
  while(queue.length){
   const p=queue.shift();pending.delete(p.id);
   if(attempted.has(p.id))continue;attempted.add(p.id);
   try{
    const r=await sb.functions.invoke('house-hunt-station-commutes',{body:{id:p.id}});
    if(r.error)throw r.error;
    if(!r.data?.commutes)throw Error(r.data?.error||'Missing journey result');
    p.station_commutes=r.data.commutes;render(p,0);render(p,1);
   }catch(e){console.warn('Journey calculation unavailable for '+p.address,e)}
   await new Promise(done=>setTimeout(done,900));
  }
  working=false;
 }
 function attach(p,i){
  const box=el('div','hh-station-access'),walk=el('div','hh-station-walk'),link=el('a','hh-station-google','Google Maps walking ↗'),pt=el('div','hh-station-pt');
  link.target='_blank';link.rel='noopener noreferrer';
  box.append(walk,link,pt);
  views.set(p.id+':'+i,{walk,link,pt});render(p,i);
  if(p.latitude!=null&&p.longitude!=null&&names(p).every(Boolean)&&!completed(p)&&!pending.has(p.id)&&!attempted.has(p.id)){
   pending.add(p.id);queue.push(p);void drain();
  }
  return box;
 }
 return {attach};
}
