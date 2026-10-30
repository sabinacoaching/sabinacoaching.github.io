// Cached TfL Tuesday estimates (07:30-17:30) for each destination station.
// The only external link per station is the Google Maps WALKING route.
export function setupStationAccess({sb}){
 const el=(tag,css='',txt='')=>{const e=document.createElement(tag);e.className=css;e.textContent=txt;return e};
 const name=(p,i)=>String(i===0?p.station_name||'':p.station_2_name||'').trim();
 function stationName(raw){
  if(/tram/i.test(raw))return raw.replace(/\s*(?:tram\s*)?stop$/i,'')+' Tram Stop, London, UK';
  if(/underground|tube/i.test(raw)||/^Ealing Common$/i.test(raw))return raw.replace(/\s*underground$/i,'')+' Underground Station, London, UK';
  return raw.replace(/\s*(?:rail|railway|train|station)$/i,'')+' Railway Station, London, UK';
 }
 function mapsUrl(p,i){
  const origin=p.latitude!=null&&p.longitude!=null?p.latitude+','+p.longitude:p.address||'';
  return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin,destination:stationName(name(p,i)),travelmode:'walking'}).toString();
 }
 function attach(p,i){
  const box=el('div','hh-station-access'),walk=el('div','hh-station-walk'),pt=el('div','hh-station-pt'),
   link=el('a','hh-station-google','Google Maps walking ↗');
  const rawMiles=p[i===0?'station_distance_miles':'station_2_distance_miles'];
  const ov=p.station_commutes?.google_verified?.[name(p,i)]||{};
  const stored=p.station_commutes?.results?.[i]||{};
  const verified=stored.google_walking||{};
  const miles=ov.walking_miles??verified.miles??rawMiles;
  const walkMins=ov.walking_minutes??verified.minutes??(miles!=null?Math.round(Number(miles)*20):null);
  // A walking fallback is explicitly approximate; don't imply these are actual Google API numbers.
  walk.textContent='Walking: '+(miles!=null?Number(miles).toFixed(2)+' mi':'—')+
    (walkMins!=null?' / '+(ov.walking_minutes!=null||verified.minutes!=null?'':'~')+Math.round(walkMins)+' min':'');
  const ptMins=ov.pt_minutes??stored.avg_minutes;
  if(ptMins!=null&&Number.isFinite(Number(ptMins))){
   pt.textContent='PT: ~'+Math.round(Number(ptMins))+' min';
   pt.title=ov.pt_minutes!=null?'Google Maps time supplied for this route':'TfL estimate: mean travel time for Tuesday departures 07:30, 10:00, 12:30, 15:00, 17:30';
  }else if(walkMins!=null){
   // Only used if TfL failed to supply a journey. Never pass a derived guess as a verified timetable.
   pt.textContent='PT: ~'+Math.round(walkMins)+' min';
   pt.title='Temporary estimate based on walking distance; public-transport route not yet confirmed';
  }else pt.textContent='PT: —';
  link.href=mapsUrl(p,i);link.target='_blank';link.rel='noopener noreferrer';
  box.append(walk,link,pt);return box;
 }
 return {attach};
}
