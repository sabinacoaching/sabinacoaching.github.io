// Optional, client-side extraction of labelled measurements from a floor-plan image.
// Never guesses dimensions where no labelled measurements are visible.
let scriptTask=null,workerTask=null;
function loadScript(){
 if(window.Tesseract?.createWorker)return Promise.resolve(window.Tesseract);
 if(scriptTask)return scriptTask;
 scriptTask=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  script.async=true;
  const timer=setTimeout(()=>{script.remove();reject(Error('OCR library timed out'))},15000);
  script.onload=()=>{clearTimeout(timer);window.Tesseract?.createWorker?resolve(window.Tesseract):reject(Error('OCR library unavailable'))};
  script.onerror=()=>{clearTimeout(timer);reject(Error('OCR library could not be loaded'))};
  document.head.append(script);
 }).catch(e=>{scriptTask=null;throw e});
 return scriptTask;
}
async function getWorker(){
 if(!workerTask){workerTask=loadScript().then(t=>t.createWorker('eng')).catch(e=>{workerTask=null;throw e})}
 return workerTask;
}
const numeric=s=>Number(String(s).replace(',','.'));
export function parsePlanText(original){
 const text=String(original||'').replace(/[×✕]/g,'x').replace(/(\d),(\d)/g,'$1.$2').replace(/\s+/g,' ');
 const result={},areaMatches=[
   /(?:total\s+(?:internal\s+|gross\s+)?(?:floor\s+)?area|gross\s+internal\s+area|gia|approx(?:imate)?\s+floor\s+area)[\s:;./\-]{0,15}.{0,95}?(\d{2,3}(?:\.\d{1,2})?)\s*(?:sq\.?\s*m(?:etres?)?|sqm|m2|m²)(?=\s|$|[.,;])/i,
   /(\d{2,3}(?:\.\d{1,2})?)\s*(?:sq\.?\s*m|sqm|m2|m²).{0,45}?(?:total\s+(?:internal\s+)?area|gross\s+internal\s+area)\b/i,
   /(?:total\s+(?:internal\s+|gross\s+)?(?:floor\s+)?area|gross\s+internal\s+area|gia|approx(?:imate)?\s+floor\s+area)[\s:;./\-]{0,15}.{0,95}?(\d{3,4}(?:\.\d{1,2})?)\s*(?:sq\.?\s*f(?:t|eet)|sq\.?\s*ft|square\s+feet)(?=\s|$|[.,;])/i
 ];
 for(const rx of areaMatches){
  const m=text.match(rx);if(m){const n=numeric(m[1]);const converted=/sq\.?\s*f(?:t|eet)|square\s+feet/i.test(m[0])?Math.round(n*0.09290304*100)/100:n;if(converted>=35&&converted<=500){result.floor_area_sqm=converted;break}}
 }
 // A garden measurement must occur immediately after its label on the SAME printed line.
 // Do not join arbitrary room sizes to a garden label elsewhere in the floor plan.
 const gardenLines=String(original||'').split(/[\r\n]+/);
 let garden=null;
 for(const row of gardenLines){
  const candidate=row.replace(/[×✕]/g,'x').replace(/(\d),(\d)/g,'$1.$2').trim()
    .match(/^(?:(?:rear|private|back)\s+)?garden\s*[:( -]?\s*(?:(?:dimensions?|size|measures?|approx(?:imately)?)\s*[: -]?\s*)?(\d{1,2}(?:\.\d{1,2})?)\s*(?:m|metres?)?\s*(?:x|by)\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:m|metres?)\b/i);
  if(candidate){garden=candidate;break}
 }
 if(garden){
  const width=numeric(garden[1]),length=numeric(garden[2]),sqm=width*length;
  if(width>1&&width<=40&&length>1&&length<=50&&sqm>=8&&sqm<=1500)result.garden_area_sqm=Math.round(sqm*100)/100;
 }
 // Count storeys only when the plan explicitly labels a ground floor and subsequent levels.
 const planLabels=String(original||'');
 if(/\bground\s+floor\b/i.test(planLabels)&&/\bfirst\s+floor\b/i.test(planLabels)){
  result.floors=/\bthird\s+floor\b/i.test(planLabels)?4:/\bsecond\s+floor\b/i.test(planLabels)?3:2;
 }
 // Room labels are authoritative for bathroom/WC classification, unlike the portal's combined count.
 // Only count room labels occupying their own OCR line. An unlabelled room is left unknown.
 const labelLines=String(original||'').split(/[\r\n]+/).map(line=>line.trim().replace(/\s+/g,' '));
 let wetRooms=0,wcRooms=0;
 for(const line of labelLines){
   if(/^(?:bathroom|bath room|shower(?:\s*room)?|wet\s*room|en[\s-]?suite(?:\s*(?:bath|shower)?room)?)(?:\s*[1-4])?\s*(?:[(]\s*\d.*[)])?$/i.test(line))wetRooms++;
   else if(/^(?:w\.?\s*c\.?|toilet|cloakroom(?:\s+w\.?\s*c\.?)?|guest\s+w\.?\s*c\.?)(?:\s*[1-4])?\s*$/i.test(line))wcRooms++;
 }
 if(wetRooms>0&&wetRooms<=8&&wcRooms<=5){
   result.plan_bathrooms=wetRooms;
   result.plan_separate_wcs=wcRooms;
 }
 return result;
}
export async function analyzeFloorplan({sb,property,photo}){
 const p=property;
 if(!p?.id||!(p.floorplans||[]).length)return {status:'not-needed'};
 const fingerprint=(p.floorplans||[])[0].path||(p.floorplans||[])[0].url;
 const key='hh-plan-ocr-v6:'+p.id+':'+fingerprint;
 let last=0;try{last=Number(localStorage.getItem(key)||0)}catch{}
 if(last&&Date.now()-last<30*86400000)return {status:'already-checked'};
 const imageUrl=await photo(p.floorplans[0]);
 if(!imageUrl||/\.pdf(?:\?|$)/i.test(fingerprint)||/^https:\/\/www\.onthemarket\.com\/details\/\d+\/#\/floorplans\/\d+$/i.test(imageUrl))return {status:'external-floorplan-viewer'};
 const res=await fetch(imageUrl);
 if(!res.ok)throw Error('Cannot read floor plan '+res.status);
 const blob=await res.blob();
 if(!blob.type.startsWith('image/'))return {status:'unsupported-plan'};
 const worker=await getWorker(),recognized=await worker.recognize(blob);
 const measurements=parsePlanText(recognized.data.text||''),changes={};
 // Total floor area printed on the plan has priority over an approximate listing value.
 if(measurements.floor_area_sqm!=null&&Math.abs(Number(p.floor_area_sqm)-measurements.floor_area_sqm)>0.2)changes.floor_area_sqm=measurements.floor_area_sqm;
 if(p.floor_area_sqm==null&&measurements.floor_area_sqm!=null)changes.floor_area_sqm=measurements.floor_area_sqm;
 if(p.garden_area_sqm==null&&measurements.garden_area_sqm!=null)changes.garden_area_sqm=measurements.garden_area_sqm;
 if(p.floors==null&&measurements.floors!=null)changes.floors=measurements.floors;
 // Portal bathrooms count can include a separate WC; use labelled plan rooms only
 // when their total agrees with the total reported in the source, or the source did not give a count.
 const labelled=measurements.plan_bathrooms,standalone=measurements.plan_separate_wcs;
 const portalCount=p.bathrooms==null?null:Number(p.bathrooms);const existingTotal=portalCount==null?null:portalCount+(p.wc_count==null?0:Number(p.wc_count));
 if(labelled!=null&&(portalCount==null||labelled+standalone===portalCount||labelled+standalone===existingTotal)){
   if(p.bathrooms!==labelled)changes.bathrooms=labelled;
   if(p.wc_count!==standalone)changes.wc_count=standalone;
 }
 // Cache only successful readable plans; failed extraction is retried at a later visit.
 if(Object.keys(measurements).length)try{localStorage.setItem(key,String(Date.now()))}catch{}
 if(!Object.keys(changes).length)return {status:'no-labelled-measurements'};
 const saved=await sb.from('properties').update(changes).eq('id',p.id).select('id').single();
 if(saved.error)throw saved.error;
 Object.assign(p,changes);
 return {status:'saved',fields:Object.keys(changes)};
}