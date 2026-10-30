// Local-only exports: no listing fetching, no database writes, no third-party CDN.
// XLSX is an Office Open XML workbook with an uncompressed ZIP package.
const CHUNK = 32768;
const xmlSafe = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const htmlSafe = value => xmlSafe(value);
const valueOrBlank = value => value == null ? '' : value;
const readable = x => x == null ? '' : (typeof x === 'object' ? JSON.stringify(x) : String(x));
const formatDate = d => d ? new Date(d).toLocaleString('en-GB') : '';
const journey = (p, key) => {
 const mins = p.journey_estimates?.[key]?.minutes;
 return mins == null || mins === '' || !Number.isFinite(Number(mins)) ? '' : Number(mins);
};
const visibleColumns = [
 ['House', p => p.address || p.title || ''],
 ['Price GBP', p => p.price],
 ['Bedrooms', p => p.bedrooms],
 ['Bathrooms / WC', p => [p.bathrooms == null ? '' : p.bathrooms + ' baths', p.wc_count == null ? '' : p.wc_count + ' WC'].filter(Boolean).join(' / ')],
 ['Floors', p => p.floors],
 ['Total floor area m2', p => p.floor_area_sqm],
 ['Garden', p => [p.garden_area_sqm == null ? '' : p.garden_area_sqm + ' m2', p.garden_description || ''].filter(Boolean).join('\n')],
 ['Nearest stations', p => [p.station_name, p.station_2_name, p.station_3_name].filter(Boolean).join('\n')],
 ['Journey times (min)', p => ['Waterloo: ' + (journey(p, 'waterloo') || '—'), 'The Dilly: ' + (journey(p, 'dilly') || '—'), 'Dance Lab: ' + (journey(p, 'dancelab') || '—')].join('\n')],
 ['Sabina comments', p => p.comment_sabina || ''],
 ['David comments', p => p.comment_david || ''],
 ['Viewing status', p => p.status || 'No status'],
 ['Viewing date', p => formatDate(p.viewing_at)],
 ['Original listing', p => p.url || ''],
 ['Floor plans (stored paths)', p => (p.floorplans || []).map(x => x.path || x.url || '').join('\n')],
 ['Photographs (stored paths)', p => (p.images || []).map(x => x.path || x.url || '').join('\n')]
];
const tableData = rows => [visibleColumns.map(c => c[0]), ...rows.map(p => visibleColumns.map(c => valueOrBlank(c[1](p))))];
const rawData = rows => {
 const keys = [...new Set(rows.flatMap(p => Object.keys(p)))];
 return [keys, ...rows.map(p => keys.map(k => valueOrBlank(readable(p[k]))))];
};
const utf8 = str => new TextEncoder().encode(str);
function crc32(bytes) {
 let crc = 0xFFFFFFFF;
 for(const n of bytes){crc ^= n;for(let j=0;j<8;j++)crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);}
 return (crc ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(items) {
 const local=[],central=[]; let offset=0;
 for(const [name, body] of items){
  const nameBytes=utf8(name), data=utf8(body), checksum=crc32(data);
  const header=new Uint8Array(30 + nameBytes.length),v=new DataView(header.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,checksum,true);
  v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,nameBytes.length,true);
  header.set(nameBytes,30);local.push(header,data);
  const dir=new Uint8Array(46 + nameBytes.length),d=new DataView(dir.buffer);
  d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);
  d.setUint32(16,checksum,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);
  d.setUint16(28,nameBytes.length,true);d.setUint32(42,offset,true);
  dir.set(nameBytes,46);central.push(dir);
  offset+=header.length+data.length;
 }
 const directorySize=central.reduce((sum,c)=>sum+c.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
 v.setUint32(0,0x06054b50,true);v.setUint16(8,items.length,true);v.setUint16(10,items.length,true);
 v.setUint32(12,directorySize,true);v.setUint32(16,offset,true);
 return new Blob([...local,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function colName(i){let out='';for(i++;i;i=Math.floor((i-1)/26))out=String.fromCharCode(65+(i-1)%26)+out;return out;}
function worksheet(rows, backup=false) {
 const count=rows[0].length, cols=rows[0].map((_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(backup?25:[36,15,12,16,9,18,28,25,28,37,37,17,20,48,48,48][i]||20)+'" customWidth="1"/>').join('');
 const body=rows.map((row,ri)=>{
  const cells=row.map((v,ci)=>{
   if(v===null||v===undefined||v==='')return '';
   if(!backup&&ri>0&&typeof v==='number'&&Number.isFinite(v))return '<c r="'+colName(ci)+(ri+1)+'" s="2"><v>'+v+'</v></c>';
   const val=String(v);
   if(val.length>32767)throw Error('An Excel cell exceeds Excel’s 32,767-character limit. No incomplete file was created.');
   return '<c r="'+colName(ci)+(ri+1)+'" t="inlineStr" s="'+(ri===0?1:2)+'"><is><t xml:space="preserve">'+xmlSafe(val)+'</t></is></c>';
  }).join('');
  return '<row r="'+(ri+1)+'"'+(ri===0?' ht="30" customHeight="1"':'')+'>'+cells+'</row>';
 }).join('');
 const last=colName(count-1)+rows.length;
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
 '<dimension ref="A1:'+last+'"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
 '<sheetFormatPr defaultRowHeight="18"/><cols>'+cols+'</cols><sheetData>'+body+'</sheetData>'+
 '<autoFilter ref="A1:'+last+'"/></worksheet>';
}
function workbook(rows, all) {
 const items=[
 ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?>'+
 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+
 '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
 '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
 '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
 '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
 ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
 ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Current table" sheetId="1" r:id="rId1"/><sheet name="Full data backup" sheetId="2" r:id="rId2"/></sheets></workbook>'],
 ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
 ['xl/styles.xml','<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF315E50"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>'],
 ['xl/worksheets/sheet1.xml',worksheet(tableData(rows))],
 ['xl/worksheets/sheet2.xml',worksheet(rawData(all),true)]
 ];
 return zipStore(items);
}
function download(blob, name) {
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function pdfHtml(rows){
 const now=new Date().toLocaleString('en-GB');
 const records=rows.map((p,i)=>{
  const attributes=visibleColumns.slice(1,13).map(([label,get])=>{
   const val=get(p);
   return '<div class="field"><div class="label">'+htmlSafe(label)+'</div><div class="val">'+htmlSafe(val == null || val === '' ? '—' : val)+'</div></div>';
  }).join('');
  const listing=p.url?'<p class="listing">Original listing: '+htmlSafe(p.url)+'</p>':'';
  return '<section class="house"><h2>'+(i+1)+'. '+htmlSafe(p.address||p.title||'Property')+'</h2><div class="facts">'+attributes+'</div>'+listing+'</section>';
 }).join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>House Hunt PDF export</title>'+
 '<style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font:11px/1.4 Arial,system-ui,sans-serif;color:#23392f;margin:20px}h1{font-size:22px;margin:0 0 5px}header{border-bottom:2px solid #315e50;padding:0 0 12px;margin-bottom:15px}header p{color:#637a6c;margin:0}.house{break-inside:avoid;page-break-inside:avoid;border:1px solid #cadbd0;border-radius:7px;padding:11px;margin:0 0 14px}h2{font-size:15px;margin:0 0 10px}.facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.field{min-width:0;break-inside:avoid}.label{font-size:10px;color:#658072;font-weight:bold}.val{overflow-wrap:anywhere;white-space:pre-wrap}.listing{overflow-wrap:anywhere;font-size:10px;margin:10px 0 0;color:#4f635a}@media screen{body{max-width:1200px;margin:20px auto;padding:0 14px}}@media print{body{margin:0}}</style></head><body><header><h1>Our House Hunt</h1><p>'+rows.length+' houses in current table · '+htmlSafe(now)+' · Print destination: Save as PDF</p></header>'+records+
 '<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print()},300)});<\/script></body></html>';
}
export function setupExports({getVisible,getAll}) {
 document.getElementById('exportExcel').addEventListener('click',()=>{
  try {
   const visible=getVisible(),all=getAll();
   if(!all.length){alert('No properties available to export.');return;}
   const day=new Date().toISOString().slice(0,10);
   download(workbook(visible,all),'house-hunt-'+day+'.xlsx');
  } catch(e){console.error('House Hunt Excel export',e);alert('Excel export failed: '+(e.message||e));}
 });
 document.getElementById('exportPdf').addEventListener('click',()=>{
  const rows=getVisible();
  if(!rows.length){alert('No visible properties to export. Change the filters first.');return;}
  const w=window.open('','_blank');
  if(!w){alert('Allow the print window for House Hunt to export as PDF.');return;}
  w.document.open();w.document.write(pdfHtml(rows));w.document.close();
 });
}
