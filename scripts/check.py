"""Check editable-content coverage, rendering and local links before publication."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import copy
import json
import yaml
from preview import ROOT, OUT, render, build

config=yaml.safe_load((ROOT/'.pages.yml').read_text())

def check_fields(data, fields, trail):
    names={f['name'] for f in fields}
    assert set(data) <= names, f'Uneditable content keys: {trail}: {set(data)-names}'
    for field in fields:
        name=field['name']
        if name not in data: continue
        value=data[name]; here=trail+'.'+name
        if field['type']=='object':
            values=value if field.get('list') else [value]
            for item in values: check_fields(item,field['fields'],here)
        elif field['type']=='rich-text':
            assert isinstance(value,str), here
            assert field.get('options',{}).get('format')=='html', here
        elif field['type']=='boolean': assert isinstance(value,bool),here
        elif field['type']=='number':
            assert isinstance(value,(int,float)),here
            assert field['options']['min']<=value<=field['options']['max'],here
        elif field['type']=='select':
            assert value in [v['name'] if isinstance(v,dict) else v for v in field['options']['values']],here
        elif field['type'] in ('string','text'): assert isinstance(value,str),here
        else: raise AssertionError('Unexpected field '+here)

for entry in config['content']:
    check_fields(json.loads((ROOT/entry['path']).read_text()),entry['fields'],entry['name'])

data={p.stem:json.loads(p.read_text()) for p in (ROOT/'_data').glob('*.json')}
changed=copy.deepcopy(data)
changed['professional_transition']['hero']['title']='Проверка самостоятельной правки'
changed['professional_transition_design']['palette']['green']='#123456'
changed['professional_transition_design']['layout']['hero_text_width']=640
changed['professional_transition']['sections'][0]['body']='<p><strong>Новый абзац автора</strong></p>'
changed['professional_transition']['conditions']['base_price']='81 000 руб.'
changed['professional_transition']['faq'][0]['hidden']=False
changed['professional_transition']['faq'][0]['answer']='<p>Новый ответ автора</p>'
changed['professional_transition']['situations']['cards'][0].update({'title':'Изменённый заголовок ситуации','short':'Изменённая короткая фраза','body':'<p>Изменённый раскрывающийся текст</p>'})
changed['professional_transition']['sections'].append({'title':'Новый раздел','body':'<p>Дополнение</p>'})
rendered=render((ROOT/'programs/professional-transition/index.html').read_text(),{'site':{'data':changed,'baseurl':''}})
for value in ['Проверка самостоятельной правки','<strong>Новый абзац автора</strong>','81 000 руб.','Новый ответ автора','Изменённый заголовок ситуации','Изменённая короткая фраза','Изменённый раскрывающийся текст','Новый раздел','tone-light']:
    assert value in rendered, value
assert 'id="11"' in rendered
assert '--green: #123456;' in rendered
assert '--hero-text-width: 640px;' in rendered
assert '{{' not in rendered and '{%' not in rendered
changed['professional_transition']['seo']['draft']=False
public=render((ROOT/'programs/professional-transition/index.html').read_text(),{'site':{'data':changed,'baseurl':'/test'}})
assert 'noindex,nofollow' not in public
assert 'href="/test/assets/mindset-lab.css?v=layout-20261027"' in public

class Page(HTMLParser):
    def __init__(self): super().__init__();self.ids=[];self.links=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        if tag in ('a','link') and attrs.get('href'):self.links.append(attrs['href'])

build()
for file in OUT.rglob('*.html'):
    page=Page();page.feed(file.read_text())
    assert len(page.ids)==len(set(page.ids)),f'Duplicate ids in {file}'
    for href in page.links:
        u=urlsplit(href)
        if u.scheme or u.netloc:continue
        target=(OUT/unquote(u.path.lstrip('/'))) if u.path.startswith('/') else (file.parent/unquote(u.path))
        if not u.path:target=file
        if target.is_dir():target=target/'index.html'
        assert target.exists(),f'Missing target {file}: {href}'
        if u.fragment:
            linked=Page();linked.feed(target.read_text());assert u.fragment in linked.ids,href

new=(OUT/'programs/professional-transition/index.html').read_text()
assert 'id="approach"' not in new
assert 'class="section-number"' not in new
for anchor in ['trajectory','values','format','audience']:
    assert new.count('id="'+anchor+'"')==1,anchor
assert new.count('class="situation-card curriculum-step"')==5
positions=[new.index('id="'+anchor+'"') for anchor in ['outcomes','format','audience','program','conditions','about','faq','join']]
assert positions==sorted(positions),'Unexpected section order'
restored=copy.deepcopy(data)
next(s for s in restored['professional_transition']['sections'] if s['id']=='approach')['hidden']=False
assert 'id="approach"' in render((ROOT/'programs/professional-transition/index.html').read_text(),{'site':{'data':restored,'baseurl':''}})
for card in data['professional_transition']['situations']['cards']:
    assert not card['title'][0].isdigit(),card['title']
for invalid in ['жизнеобращующими','надо перечислить','этот пункт был решением','[STORY_SPACE]','Здесь дальше будет история','—']:
    assert invalid not in new,invalid
print('Passed: CMS coverage, edit-to-page rendering, new sections, draft toggle, base URL, links, anchors and content checks.')


assert new.count('class="stage-number"')==5
assert new.index('class="prose curriculum-note"')>new.index('id="stage-title-5"')
assert "position:static" in (ROOT/'assets/transition-design.css').read_text()
print('Passed: author design settings, five numbered stages, note after fifth stage.')

assert len(data['professional_transition']['faq'])==6
assert sum(not x.get('hidden',False) for x in data['professional_transition']['faq'])==6
assert '--promo: #e4b49d;' in new
assert data['professional_transition_design']['palette']['accent']=='#b54d35'
print('Passed: separate peach callouts, original coral buttons, all six FAQ entries displayed.')
