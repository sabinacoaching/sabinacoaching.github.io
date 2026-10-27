from pathlib import Path
import copy, json, html, re, sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from preview import build
build()
out=ROOT/'.preview'
base=json.loads((ROOT/'_data/professional_transition_design.json').read_text())
palettes={
 'a':base['palette'],
 'b':{'green':'#20434B','deep':'#152E35','ink':'#203941','light':'#F6F9F9','paper':'#E7EEEE','card':'#E4ECEF','white':'#FFFFFF','accent':'#BAD5E4','accent_ink':'#173944','muted':'#566B73'}
}
source=(out/'programs/professional-transition/index.html').read_text()
source=re.sub(r'<link rel="stylesheet" href="[^"]+">',lambda m:'<style>'+((ROOT/'assets/transition-design.css').read_text() if 'transition-design.css' in m[0] else (ROOT/'assets/mindset-lab.css').read_text())+'</style>',source)
source=re.sub(r'<script src="[^"]*situations.js[^"]*" defer></script>','<script>'+(ROOT/'assets/situations.js').read_text()+'</script>',source)
source=source.replace('<title>','<title>Макет: ',1)

LABELS={
 'green':'Тёмный фон','light':'Светлый фон','paper':'Второй светлый фон','card':'Карточки ситуаций','white':'Карточки результатов','accent':'Плашки и кнопки','ink':'Основной текст',
 'hero_title_size':'Размер названия','hero_text_size':'Размер описания','hero_text_width':'Ширина описания','hero_title_width':'Ширина названия','hero_padding_top':'Отступ первого экрана сверху','hero_padding_bottom':'Отступ первого экрана снизу',
 'comparison_gap':'Расстояние между колонками','comparison_title_size':'Заголовки сравнения','section_spacing':'Отступы разделов','promo_width':'Ширина цветных плашек','promo_offset':'Отступ перед плашкой','note_width':'Ширина «Важно»','card_radius':'Скругление карточек'
}
RANGES={'hero_title_size':(38,72),'hero_text_size':(16,24),'hero_text_width':(480,850),'hero_title_width':(520,950),'hero_padding_top':(28,100),'hero_padding_bottom':(28,100),'comparison_gap':(80,180),'comparison_title_size':(26,38),'section_spacing':(48,120),'promo_width':(700,1060),'promo_offset':(24,80),'note_width':(700,1060),'card_radius':(0,24)}
panel='''<div class="review-toolbar"><div><strong>Mindset Lab</strong><span class="review-caption">Макет. Изменения не опубликованы.</span></div><div class="review-actions"><button data-palette="a">А: зелёный / охра</button><button data-palette="b">Б: сине-зелёный / голубой</button><button id="review-settings" aria-expanded="false">Оформление</button></div></div><aside id="design-panel" hidden><div class="design-panel-header"><strong>Оформление макета</strong><button id="review-close" aria-label="Закрыть настройки">×</button></div><p>Изменения сразу видны на макете. Сохраняются в этом браузере и не публикуются на сайт.</p><h3>Цвета</h3>'''
LABELS['accent_ink']='Текст на плашках'
for key in ['green','light','paper','card','white','accent','accent_ink','ink']:
 panel+=f'<label class="design-color"><span>{LABELS[key]}</span><input type="color" data-group="palette" data-key="{key}" value="{base["palette"][key]}"></label>'
panel+='<h3>Размеры и расстояния</h3>'
for key,(lo,hi) in RANGES.items():
 panel+=f'<label class="design-number"><span>{LABELS[key]}, px</span><input type="number" data-group="layout" data-key="{key}" min="{lo}" max="{hi}" value="{base["layout"][key]}"></label>'
panel+='<h3>Фоны разделов</h3>'
sections=[('recognition','Ситуации','light'),('trajectory','Два варианта будущего','green'),('barriers','Почему сложно решиться','light'),('outcomes','Результаты','paper'),('format','Формат и участники','green'),('program','Пять этапов','light'),('conditions','Условия','green'),('about','Кто ведёт','light'),('faq','Вопросы','light'),('join','Финальное приглашение','paper')]
for sid,label,tone in sections:
 panel+=f'<label class="design-number"><span>{label}</span><select data-section="{sid}">'+''.join(f'<option value="{v}"'+(' selected' if tone==v else '')+f'>{l}</option>' for v,l in [('light','Светлый'),('paper','Второй светлый'),('green','Тёмный')])+'</select></label>'
panel+='''<button class="design-save" id="download-settings">Скачать настройки</button><button class="design-save design-secondary" id="download-mockup">Скачать макет с правками</button><button class="design-reset" id="reset-design">Сбросить мои изменения</button><p id="design-status" role="status"></p><p>В редакторе сайта эти параметры вынесены в «Оформление лендинга». До выбора варианта они подготовлены в черновике.</p></aside>'''

ui_css='''
.review-toolbar{position:relative;z-index:20;background:#fff;color:#25332e;border-bottom:1px solid #dadfdc;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 24px;font:13px/1.4 Arial,sans-serif}.review-toolbar strong{font-size:17px}.review-caption{margin-left:15px;color:#637168}.review-actions{display:flex;gap:8px}.review-toolbar button,#design-panel button{font:13px/1.3 Arial,sans-serif;border:1px solid #d5dbd7;border-radius:7px;background:#f6f8f6;color:#23392d;padding:9px 12px;cursor:pointer}.review-toolbar button[aria-pressed="true"]{background:#23392d;color:#fff}.review-toolbar button#review-settings{background:#23392d;color:#fff}#design-panel{position:fixed;z-index:1000;right:0;top:0;bottom:0;width:min(380px,100vw);padding:22px;background:#fff;color:#23382c;box-shadow:-10px 0 40px #0002;overflow:auto;font:13px/1.5 Arial,sans-serif}#design-panel[hidden]{display:none}#design-panel h3{font:600 16px/1.3 Arial,sans-serif;margin:25px 0 14px}#design-panel p{color:#53655a;font-size:12px}.design-panel-header{display:flex;justify-content:space-between;align-items:center;font-size:17px}.design-color,.design-number{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:13px}.design-color input{height:32px;width:50px;padding:2px;border:1px solid #ccd4ce;border-radius:4px}.design-number input{width:76px;padding:6px;border:1px solid #ccd4ce;border-radius:4px;font:inherit}.design-number select{max-width:130px;font:inherit;padding:5px}.design-save{display:block;width:100%;margin-top:15px;background:#23392d!important;color:#fff!important}.design-secondary{background:#f1f5f2!important;color:#23392d!important}.design-reset{width:100%;margin-top:12px}.review-photo-space{position:absolute;right:0;top:110px;width:275px;height:340px;border:1px dashed #ffffff35;border-radius:50% 50% 6px 6px;display:flex;align-items:center;justify-content:center;color:#ffffff66;font:13px/1.4 Arial,sans-serif;text-align:center;pointer-events:none}.hero-inner{position:relative}.review-photo-space span{max-width:140px}@media(max-width:1150px){.review-photo-space{display:none}}@media(max-width:800px){.review-toolbar{flex-direction:column;align-items:flex-start;padding:12px 16px}.review-caption{display:block;margin:4px 0 0}.review-actions{flex-wrap:wrap}.review-toolbar button{font-size:11px;padding:8px}.review-photo-space{display:none}}
'''
js='''
(() => {
 const BASE=__BASE__, PALETTES=__PALETTES__, sectionDefaults=__SECTIONS__;
 let current=structuredClone(BASE), tones={...BASE.section_tones,conditions:BASE.conditions_tone,join:BASE.join_tone}, selected='a';
 const key='mindset-lab-design-review-v3';
 const query=new URLSearchParams(location.search);
 let restored=false;
 try { const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&!query.has('palette')){current=saved.settings;tones=saved.tones;selected=saved.palette;restored=true;} }catch{}
 if(query.get('palette')==='b'){current.palette=structuredClone(PALETTES.b);selected='b';}
 const style=document.createElement('style');style.id='review-live-settings';document.head.append(style);
 const panel=document.querySelector('#design-panel');
 function persist(){try{localStorage.setItem(key,JSON.stringify({settings:current,tones,palette:selected}));}catch{}}
 function apply(save=true){
  let css=':root {';
  for(const [k,v] of Object.entries(current.palette)){css+='--'+k.replaceAll('_','-')+':'+v+';';}
  css+='--clay:'+current.palette.accent+';';
  for(const [k,v] of Object.entries(current.layout)){css+='--'+k.replaceAll('_','-')+':'+v+'px;';} css+='}';
  for(const [id,tone] of Object.entries(tones)){
   const dark=tone==='green';css+='#'+id+'{background:var(--'+tone+');color:var(--'+(dark?'light':'ink')+');}';
   css+='#'+id+' h2,#'+id+' h3,#'+id+' .prose{color:inherit;}';
   if(id==='format')css+='#format .paired-panel+.paired-panel{border-color:'+(dark?'var(--white-line)':'var(--line)')+';}';
  }
  style.textContent=css;
  document.querySelectorAll('[data-group]').forEach(input=>input.value=current[input.dataset.group][input.dataset.key]);
  document.querySelectorAll('[data-section]').forEach(input=>input.value=tones[input.dataset.section]);
  document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===selected)));
  if(save)persist();
 }
 document.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.palette;current.palette=structuredClone(PALETTES[selected]);apply();}));
 const setPanel=open=>{panel.hidden=!open;document.querySelector('#review-settings').setAttribute('aria-expanded',String(open));};
 document.querySelector('#review-settings').addEventListener('click',()=>setPanel(panel.hidden));document.querySelector('#review-close').addEventListener('click',()=>setPanel(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')setPanel(false)});
 document.querySelectorAll('[data-group]').forEach(input=>input.addEventListener('input',()=>{
  const value=input.type==='number'?Number(input.value):input.value;
  if(input.type==='number'&&(!Number.isFinite(value)||value<Number(input.min)||value>Number(input.max)))return;
  current[input.dataset.group][input.dataset.key]=value;apply();
 }));
 document.querySelectorAll('[data-section]').forEach(input=>input.addEventListener('change',()=>{tones[input.dataset.section]=input.value;if(input.dataset.section==='join')current.join_tone=input.value;else if(input.dataset.section==='conditions')current.conditions_tone=input.value;else current.section_tones[input.dataset.section]=input.value;apply();}));
 function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#design-status').textContent='Файл подготовлен для скачивания.';}
 document.querySelector('#download-settings').addEventListener('click',()=>download('professional_transition_design.json',JSON.stringify(current,null,2),'application/json'));
 document.querySelector('#download-mockup').addEventListener('click',()=>{
  const copy=document.documentElement.cloneNode(true);copy.querySelector('#design-panel').hidden=true;
  copy.querySelector('#review-state').textContent=JSON.stringify({settings:current,tones,palette:selected}).replaceAll('<','\\u003c');
  download('Mindset-Lab-design-edited.html','<!doctype html>\\n'+copy.outerHTML,'text/html');
 });
 document.querySelector('#reset-design').addEventListener('click',()=>{current=structuredClone(BASE);tones={...BASE.section_tones,conditions:BASE.conditions_tone,join:BASE.join_tone};selected='a';apply();});
 try {const state=JSON.parse(document.querySelector('#review-state').textContent||'null');if(state&&!restored&&!query.has('palette')){current=state.settings;tones=state.tones;selected=state.palette;}}catch{}
 apply(false);
})();
'''.replace('__BASE__',json.dumps(base,ensure_ascii=False)).replace('__PALETTES__',json.dumps(palettes,ensure_ascii=False)).replace('__SECTIONS__',json.dumps(sections,ensure_ascii=False))
review=source.replace('</head>','<style>'+ui_css+'</style></head>').replace('<body class="transition-landing">','<body class="transition-landing">'+panel)
review=review.replace('<div class="container hero-inner">','<div class="container hero-inner"><div class="review-photo-space" aria-hidden="true"><span>Место под фотографию</span></div>',1)
review=review.replace('</body>','<script type="application/json" id="review-state">null</script><script>'+js+'</script></body>')
dest=out/'design-review';dest.mkdir(exist_ok=True)
(dest/'index.html').write_text(review)
deliverables=ROOT.parent/'design-deliverables';deliverables.mkdir(exist_ok=True)
(deliverables/'Mindset-Lab-design-review.html').write_text(review)
(ROOT/'assets/design-review-presets.json').write_text(json.dumps(palettes,ensure_ascii=False,indent=2)+'\n')

# Palette boards use the real landing fragments, scaled uniformly for comparison.
shared=''.join(re.findall(r'<style\b[^>]*>.*?</style>',review,flags=re.S))
shared+='<style>html{scroll-behavior:auto}body{overflow:hidden}.section{padding-block:58px!important}.section-heading{position:static!important}.hero-inner{padding-block:40px!important}.review-photo-space{display:flex!important}.footer{display:none!important}</style>'
blocks=[
 ('Первый экран','#top',690),
 ('Два варианта будущего','#trajectory',680),
 ('Причины и переход к предложению','#barriers',1000),
 ('Результаты программы','#outcomes',1370),
 ('Формат и участники','#format',760),
 ('Пять этапов и примечание','#program',1600),
 ('Условия участия','#conditions',880),
 ('Финальное приглашение','#join',510)
]
for choice in ['a','b']:
 palette=palettes[choice]
 override='<style>:root {'+''.join('--'+k.replace('_','-')+':'+v+';' for k,v in palette.items())+'--clay:'+palette['accent']+';}</style>'
 cards=[]
 for title,selector,height in blocks:
  frag=re.search(r'<section\b[^>]*\bid="'+selector[1:]+r'"[^>]*>.*?</section>',review,flags=re.S)[0]
  if selector=='#top':frag=re.search(r'<header class="site-header">.*?</header>',review,flags=re.S)[0]+frag
  doc='<!doctype html><html><head><meta charset="utf-8">'+shared+override+'</head><body class="transition-landing">'+frag+'</body></html>'
  cards.append('<article><h2>'+title+'</h2><div class="frame-box" style="height:'+str(height*.45)+'px"><iframe title="'+title+'" style="height:'+str(height)+'px" srcdoc="'+html.escape(doc,quote=True)+'"></iframe></div></article>')
 colors=''.join('<span style="background:'+palette[k]+'"></span>' for k in ['green','light','paper','card','accent'])
 name='А. Тёмно-зелёный, тёплый светлый, охра' if choice=='a' else 'Б. Сине-зелёный, прохладный светлый, голубой'
 board='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+name+'</title><style>*{box-sizing:border-box}body{margin:0;background:#e2e5e2;color:#25382f;font-family:Arial,sans-serif}header{padding:24px 28px 20px;display:flex;justify-content:space-between;align-items:center}h1{font-size:25px;margin:0 0 8px}header p{margin:0;color:#5d6a62;font-size:14px}.swatches{display:flex;gap:6px}.swatches span{display:block;width:38px;height:38px;border-radius:50%;border:1px solid #0002}main{padding:0 24px 28px;display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}article{background:#fff;border:1px solid #c8d0ca;border-radius:5px;overflow:hidden}article>h2{font-size:12px;letter-spacing:.02em;margin:0;padding:10px 14px;border-bottom:1px solid #d8dfd9}.frame-box{position:relative;overflow:hidden}iframe{display:block;border:0;width:1360px;transform:scale(.45);transform-origin:0 0;pointer-events:none}</style></head><body><header><div><h1>'+name+'</h1><p>Одинаковая структура и тексты. Разные цвета и акценты.</p></div><div class="swatches">'+colors+'</div></header><main>'+''.join(cards)+'</main><script>document.querySelectorAll("iframe").forEach(f=>f.addEventListener("load",()=>{const d=f.contentDocument,h=d.querySelector("section").getBoundingClientRect().height+(d.querySelector("header")?.getBoundingClientRect().height||0)+4;f.style.height=h+"px";f.parentElement.style.height=h*.45+"px";}));</script></body></html>'
 (dest/('palette-'+choice+'.html')).write_text(board)
print('Built standalone editable review and two palette boards')
