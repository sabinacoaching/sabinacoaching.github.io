// Station journey estimates are independent of the three main travel destinations.
// The Google Maps route opens with one click; numbers are labelled Google only when
// returned by the authenticated server using the official Google Routes API.
export function setupStationAccess({sb}) {
 const queue=[],pending=new Set(),views=new Map(),retry=new Map();
 let processing=false;
 const node=(tag,cls='',content)=>{const e=document.createElement(tag);e.className=cls;e.textContent=content;return e};
 const names=p=>[p.station_name||'',p.station_2_name||''];
 const fresh=p=>{
  const c=p.station_commutes;
  return p.latitude!=null&&p.longitude!=null&&c?.origin===p.latitude+','+p.longitude&&
    JSON.stringify(c.names)===JSON.stringify(names(p))&&Array.isArray(c.results)&&
    Date.now()-Date.parse(c.calculated_at||0)<6*86400000;
 };
 function googleUrl(p,i,result){
  const origin=p.latitude!=null&&p.longitude!=null?p.latitude+','+p.longitude:p.address||'';
  const destination=result?.lat!=null&&result?.lon!=null?
    result.lat+','+result.lon:(names(p)[i]+' station, London, UK');
  return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin,destination,travelmode:'walking'}).toString();
 }
 function update(p,i){
  const v=views.get(p.id+':'+i);if(!v)return;
  const c=fresh(p)?p.station_commutes:null,r=c?.results?.[i],g=r?.google_walking;
  const distanceKey=i===0?'station_distance_miles':'station_2_distance_miles';
  const mi=g?.miles!=null?Number(g.miles).toFixed(2):p[distanceKey]!=null?Number(p[distanceKey]).toFixed(2):'—';
  const walkingMinutes=g?.minutes!=null?Math.round(g.minutes)+' min':'— min';
  v.walk.textContent='Walking: '+mi+' mi / '+walkingMinutes;
  v.google.href=googleUrl(p,i,r);
  if(r?.avg_minutes!=null){
   v.pt.textContent='PT: ~'+Math.round(r.avg_minutes)+' min';
   v.pt.title='TfL average, '+r.samples.filter(x=>x.minutes!=null).length+' of 5 Tuesday departures: 07:30, 10:00, 12:30, 15:00, 17:30';
  }else{
   v.pt.textContent='PT: '+(r?.error?'unavailable':r?.note?'no reliable route':p.latitude==null?'no map point':'calculating…');
   v.pt.title=r?.error||r?.note||'';
  }
  v.source.textContent=g?'Walking: Google Maps · PT: TfL':(mi!=='—'?'Distance: OSM route · ':'')+'Google walking minutes not yet available · PT: TfL';
 }
 async function processQueue(){
  if(processing)return;processing=true;
  while(queue.length){
   const p=queue.shift();
   try{
    const res=await sb.functions.invoke('house-hunt-station-commutes',{body:{id:p.id}});
    if(res.error)throw res.error;
    if(!res.data?.commutes)throw Error(res.data?.error||'No station journey data');
    p.station_commutes=res.data.commutes;
    update(p,0);update(p,1);
   }catch(e){
    console.warn('Station commute calculation',p.address,e);
    retry.set(p.id,Date.now()+180000);
    for(let i=0;i<2;i++){const v=views.get(p.id+':'+i);if(v)v.pt.textContent='PT: unavailable'}
   }finally{pending.delete(p.id)}
   await new Promise(resolve=>setTimeout(resolve,5200));
  }
  processing=false;
 }
 function attach(p,i){
  const box=node('div','hh-station-access'),walk=node('div','hh-station-walk'),
        pt=node('div','hh-station-pt'),google=node('a','hh-station-google','Google Maps walking ↗'),
        source=node('small','hh-station-source');
  google.target='_blank';google.rel='noopener noreferrer';google.title='Open walking directions from house to this station';
  box.append(walk,google,pt,source);
  views.set(p.id+':'+i,{walk,pt,google,source});
  update(p,i);
  if(p.latitude!=null&&p.longitude!=null&&names(p)[i]&&!fresh(p)&&!pending.has(p.id)&&Date.now()>(retry.get(p.id)||0)){
    pending.add(p.id);queue.push(p);void processQueue();
  }
  return box;
 }
 return {attach};
}
