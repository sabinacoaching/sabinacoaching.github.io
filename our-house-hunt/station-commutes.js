// The station is supplied to Google Maps by its real STATION NAME, never its
// approximate TfL point coordinates (which Google can label as a nearby road).
// Public-transport times stay hidden until validated by a Google route source.
export function setupStationAccess({sb}) {
 const node=(tag,cls='',value)=>{const e=document.createElement(tag);e.className=cls;e.textContent=value;return e};
 const nameFor=(p,i)=>String(i===0?p.station_name||'':p.station_2_name||'').trim();
 function stationDestination(p,i){
  const raw=nameFor(p,i);
  if(!raw)return '';
  if(/tram/i.test(raw))return raw.replace(/\s*(?:tram\s*)?stop$/i,'')+' Tram Stop, London, UK';
  if(/underground|tube/i.test(raw)||/^Ealing Common$/i.test(raw))return raw.replace(/\s*underground$/i,'')+' Underground Station, London, UK';
  return raw.replace(/\s*(?:rail|railway|train|station)$/i,'')+' Railway Station, London, UK';
 }
 function mapsUrl(p,i,mode){
  // Coordinates are only for the HOUSE origin. For the destination use a named
  // railway/Underground/tram station to resolve the correct entrance in Maps.
  const origin=p.latitude!=null&&p.longitude!=null?p.latitude+','+p.longitude:p.address||'';
  return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin,destination:stationDestination(p,i),travelmode:mode}).toString();
 }
 function attach(p,i){
  const box=node('div','hh-station-access'),walk=node('div','hh-station-walk'),google=node('a','hh-station-google','Google Maps walking ↗'),transit=node('a','hh-station-google','PT: Google Maps ↗');
  const mi=p[i===0?'station_distance_miles':'station_2_distance_miles'];
  const confirmed=p.station_commutes?.google_verified?.[nameFor(p,i)];
  const googleWalk=p.station_commutes?.results?.[i]?.google_walking;
  // Do not show an empty '/ — min'. Google has not supplied minutes via its API.
  const walkingMiles=confirmed?.walking_miles??googleWalk?.miles??mi;
  const walkingMinutes=confirmed?.walking_minutes??googleWalk?.minutes;
  walk.textContent='Walking: '+(walkingMiles==null?'—':(confirmed?.walking_miles==null&&googleWalk?.miles==null?'≈':'')+Number(walkingMiles).toFixed(2))+' mi'+(walkingMinutes!=null?' / '+Math.round(walkingMinutes)+' min':'');
  google.href=mapsUrl(p,i,'walking');google.target='_blank';google.rel='noopener noreferrer';
  transit.href=mapsUrl(p,i,'transit');transit.target='_blank';transit.rel='noopener noreferrer';
  if(confirmed?.pt_minutes!=null)transit.textContent='PT: '+Math.round(confirmed.pt_minutes)+' min · Google Maps ↗';
  // Old TfL scores varied from the times Google Maps showed and were not
  // independently reconciled. Never render them as validated PT journey times.
  box.append(walk,google,transit);
  return box;
 }
 return {attach};
}
