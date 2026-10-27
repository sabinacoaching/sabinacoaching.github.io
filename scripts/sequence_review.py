"""Produce an unabridged, paginated view of the whole landing for browser screenshots."""
from pathlib import Path
import html,re

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.preview'
source=(OUT/'design-review/index.html').read_text()
# Remove author controls but preserve all landing sections and disclosure behaviour.
source=re.sub(r'<div class="review-toolbar">.*?</aside>','',source,count=1,flags=re.S)
source=re.sub(r'<script type="application/json" id="review-state">.*?</script><script>.*?</script>','',source,count=1,flags=re.S)
source=source.replace('</head>','<style>html{scroll-behavior:auto!important;scroll-padding-top:0!important}body{padding:0}::-webkit-scrollbar{width:0}</style></head>')
# A persistent original full-scroll copy is useful independently of the browser proof.
(OUT/'design-review/complete-a.html').write_text(source)
page='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Вариант А: вся страница последовательно</title><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden;background:#e5e8e5;font-family:Arial,sans-serif;color:#17372d}.page-toolbar{height:48px;padding:8px 22px;background:#fff;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #cbd4cd;font-size:13px}.page-toolbar div{display:flex;gap:10px;align-items:center}button{border:1px solid #bdc8c0;border-radius:5px;background:#fff;color:#17372d;padding:6px 10px;font:13px Arial,sans-serif;cursor:pointer}button:disabled{opacity:.35}#frame-wrap{position:relative;margin:12px auto;background:#fff;box-shadow:0 3px 16px #17372d20}iframe{position:absolute;left:0;top:0;width:1360px;height:1120px;border:0;transform-origin:top left}#page-status{font-weight:600}
</style></head><body><header class="page-toolbar"><strong>Вариант А · исходный зелёный и коралловый</strong><div><button id="previous">Предыдущий экран</button><span id="page-status" role="status">Загрузка</span><button id="next">Следующий экран</button></div></header><main id="frame-wrap"><iframe title="Весь лендинг последовательно" srcdoc="__SOURCE__"></iframe></main><script>
const frame=document.querySelector('iframe'),wrap=document.querySelector('#frame-wrap'),statusNode=document.querySelector('#page-status');
let count=1,page=Number(new URLSearchParams(location.search).get('page')||0),totalHeight=0;
function size(){const scale=Math.min((innerWidth-32)/1360,(innerHeight-72)/1120);frame.style.transform='scale('+scale+')';wrap.style.width=(1360*scale)+'px';wrap.style.height=(1120*scale)+'px';}
function show(){page=Math.max(0,Math.min(count-1,page));frame.contentWindow.scrollTo(0,page*1120);statusNode.textContent='Экран '+(page+1)+' из '+count;document.querySelector('#previous').disabled=page===0;document.querySelector('#next').disabled=page===count-1;document.body.dataset.page=page;document.body.dataset.count=count;}
frame.addEventListener('load',()=>{const d=frame.contentDocument;totalHeight=d.documentElement.scrollHeight;count=Math.ceil(totalHeight/1120);d.body.style.paddingBottom=(count*1120-totalHeight)+'px';document.body.dataset.contentHeight=totalHeight;show();});
document.querySelector('#next').addEventListener('click',()=>{page++;show();});document.querySelector('#previous').addEventListener('click',()=>{page--;show();});
addEventListener('resize',size);size();
</script></body></html>'''.replace('__SOURCE__',html.escape(source,quote=True))
(OUT/'design-review/sequence-a.html').write_text(page)
print('Full sequential landing ready')
