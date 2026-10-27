"""Render the small Liquid subset used here for local review. Production uses Jekyll."""
from pathlib import Path
import html
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.preview'

def value(expression, context):
    comparison=re.fullmatch(r"(.+?)\s+(==|!=)\s+(.+)",expression)
    if comparison:
        left,operator,right=comparison.groups()
        a,b=value(left,context),value(right,context)
        return a==b if operator=='==' else a!=b
    parts = [x.strip() for x in expression.split('|')]
    def get(raw):
        raw = raw.strip()
        if len(raw) > 1 and raw[0] in "\"'" and raw[-1] == raw[0]: return raw[1:-1]
        if raw == 'true': return True
        if raw == 'false': return False
        if raw.isdecimal(): return int(raw)
        result = context
        for key in raw.split('.'):
            if not isinstance(result, dict): return ''
            result = result.get(key, '')
        return result
    result = get(parts[0])
    for filt in parts[1:]:
        if filt == 'escape': result = html.escape(str(result), quote=True)
        elif filt == 'relative_url':
            result = str(result)
            if not re.match(r'^(https?:)?//', result):
                result = context['site'].get('baseurl', '').rstrip('/') + '/' + result.lstrip('/')
        elif filt.startswith('default:'):
            if result is None or result is False or result == '' or result == []: result = get(filt.split(':', 1)[1])
        else: raise ValueError('Unsupported preview filter: '+filt)
    return result

def parse(tokens, index=0, stop=None):
    nodes = []
    while index < len(tokens):
        token=tokens[index]; index+=1
        if token.startswith('{{'): nodes.append(('value', token[2:-2].strip())); continue
        if not token.startswith('{%'): nodes.append(('text', token)); continue
        tag=token[2:-2].strip()
        if stop and tag == stop: return nodes, index
        if tag.startswith('for '):
            variable, expr = tag[4:].split(' in ', 1)
            inner,index=parse(tokens,index,'endfor'); nodes.append(('for',variable.strip(),expr.strip(),inner))
        elif tag.startswith('if '):
            inner,index=parse(tokens,index,'endif'); nodes.append(('if',tag[3:].strip(),inner))
        elif tag.startswith('unless '):
            inner,index=parse(tokens,index,'endunless'); nodes.append(('unless',tag[7:].strip(),inner))
        elif tag.startswith('assign '):
            key,expr=tag[7:].split('=',1);nodes.append(('assign',key.strip(),expr.strip()))
        elif tag.startswith('include '):nodes.append(('include',tag[8:].strip()))
        else: raise ValueError('Unsupported preview tag: '+tag)
    if stop: raise ValueError('Missing '+stop)
    return nodes,index

def render_nodes(nodes, context):
    result=[]
    for node in nodes:
        kind=node[0]
        if kind=='text': result.append(node[1])
        elif kind=='value': result.append(str(value(node[1],context)))
        elif kind=='assign': context[node[1]]=value(node[2],context)
        elif kind=='include': result.append(render((ROOT/'_includes'/node[1]).read_text(),dict(context)))
        elif kind=='if':
            if value(node[1],context): result.append(render_nodes(node[2],dict(context)))
        elif kind=='unless':
            if not value(node[1],context): result.append(render_nodes(node[2],dict(context)))
        elif kind=='for':
            values=value(node[2],context)
            for i,item in enumerate(values):
                inner=dict(context);inner[node[1]]=item;inner['forloop']={'index':i+1,'index0':i,'first':i==0,'last':i==len(values)-1}
                result.append(render_nodes(node[3],inner))
    return ''.join(result)

def render(text, context):
    text=re.sub(r'\A---\n.*?\n---\n','',text,count=1,flags=re.S)
    nodes,_=parse(re.split(r'({{.*?}}|{%.*?%})',text,flags=re.S))
    return render_nodes(nodes,context)

def build():
    data={p.stem:json.loads(p.read_text()) for p in (ROOT/'_data').glob('*.json')}
    context={'site':{'data':data,'baseurl':''}}
    OUT.mkdir(exist_ok=True)
    for p in ROOT.rglob('*.html'):
        relative=p.relative_to(ROOT)
        if any(part.startswith(('_','.')) for part in relative.parts):continue
        out=OUT/relative;out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(render(p.read_text(),dict(context)))
    shutil.copytree(ROOT/'assets',OUT/'assets',dirs_exist_ok=True)
    assert '{{' not in (OUT/'programs/professional-transition/index.html').read_text()
    print('Preview ready:',OUT)

if __name__=='__main__': build()
