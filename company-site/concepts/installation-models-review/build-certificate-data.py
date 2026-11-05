"""Extract installation sequences from the supplied, already published PDFs.
Run with PYTHONPATH pointing to a PyMuPDF installation. No source PDF is changed.
"""
import json,re,hashlib
import pymupdf
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
GROUPS={'metal-pipes':'metal','nonmetal-pipes':'polymer','metal-ducts':'duct','bundled-pipes':'bundle'}
items=json.loads((ROOT/'assets/data/archive.json').read_text())['items']
def compact(s):return re.sub(r'\s+','',s).replace('mm','㎜').replace('Φ','').replace('Ø','')
def number(s,pattern,default=None):
 m=re.search(pattern,s)
 return float(m[1].replace(',','')) if m else default
def clean(s):
 s=re.sub(r'--- PDF PAGE \d+ ---','',s)
 lines=[]
 for line in s.splitlines():
  line=line.strip()
  if not line or re.match(r'(?:FS-[A-Z]+\d|NO\.|No\.|\d+$|\d{4}년|-\s*\d+\s*-)',line):continue
  if '설치조감도' in compact(line) or compact(line) in ['내용','설치조감도내용','내 용']:continue
  lines.append(line)
 return re.sub(r'(?<=\d)\s+(?=\d)', '', re.sub(r'\s+',' ',' '.join(lines)).strip())
def kind(title):
 if '확인' in title:return 'opening'
 if '관통재' in title or '댐퍼' in title:return 'service'
 if '보강대' in title:return 'reinforcement'
 if '자켓' in title:return 'brackets' if ('설치2' in title or '고정' in title) else 'jacket'
 if '보드' in title:return 'board'
 if '코킹' in title or '실란트' in title:return 'sealant'
 if '고정' in title:return 'fixing'
 if '마감' in title:return 'plate'
 if '밴드' in title:return 'insulation-band' if '단열밴드' in title else 'band'
 if '그라스울' in title:return 'glasswool'
 if '고무' in title:return 'rubber'
 if '내화채움재' in title and '블랭킷' in title:return 'packing'
 if '보온재' in title or '블랭킷' in title:return 'blanket'
 raise ValueError(title)
records=[];audit=[]
for item in items:
 if item.get('cat')!='firestop' or item.get('board')!='recognition':continue
 cert=item['certificate']
 with pymupdf.open(ROOT/item['file']['href']) as document:
  s='\n'.join(f'\n--- PDF PAGE {i+1} ---\n'+page.get_text() for i,page in enumerate(document))
 start=re.search(r'\b2\.1\.?\s*시공\s*순서도',s)
 assert start,cert
 end=re.search(r'\n\s*2\.2[.\s]',s[start.end():]);stop=start.end()+end.start() if end else len(s)
 section=s[start.end():stop]
 nextvariant=re.search(r'\n\s*2\.1\.2[.\s]',section)
 if nextvariant:section=section[:nextvariant.start()]
 headings=list(re.finditer(r'<([^<>]+)>',section));assert headings,cert
 steps=[]
 for i,h in enumerate(headings):
  title=clean(h[1]);title=title.replace('설치-','설치 ').replace('시공-','시공 ')
  text=clean(section[h.end():headings[i+1].start() if i+1<len(headings) else len(section)])
  # Physical page containing the heading, retained for every step.
  page=int(re.findall(r'--- PDF PAGE (\d+) ---',s[:start.end()+h.start()])[-1])
  typ=kind(compact(title));c=compact(text)
  step={'title':title,'kind':typ,'text':text,'page':page}
  if typ in ['blanket','packing','glasswool','rubber','band','insulation-band','board']:
   step['thicknessMm']=number(c,r'두께[:：]?(\d[\d.,]*)[㎜m]')
  if typ=='blanket':
   step['lengthMm']=number(c,r'(?:지지구조로부터|를)(\d[\d,]*)㎜이상') or number(c,r'너비(\d[\d,]*)㎜이상')
   step['through']=('관통하여' in c or '연속시공' in c)
   step['layer']=number(compact(title),r'(\d+)단')
   blocks=re.findall(r'◎(\d+)A(.*?)(?=◎\d+A|$)',c)
   if blocks:
    step['perNominal']={n:{'lengthMm':number(t,r'(?:지지구조로부터|너비)(\d[\d,]*)㎜이상'),'thicknessMm':number(t,r'두께(\d[\d.,]*)㎜')} for n,t in blocks}

  if typ in ['jacket','brackets','band']:
   step['fasteners']=number(c,r'(?:브라켓|고정클립)(\d+)개')
  steps.append(step)
 first=s.split('--- PDF PAGE 2 ---')[0]
 code=re.search(r'DO-[A-Z0-9-]+',first);code=code[0] if code else cert
 c=compact(section)
 diameters=list(dict.fromkeys(float(n.replace(',','')) for n in re.findall(r'외경[:：]?(?:직경)?(\d[\d.,]*)㎜',compact(first+' '+section))))
 if item['group']=='bundled-pipes' and '개별관통재최대' in compact(first):
  table=compact(first).split('개별관통재최대')[1].split('6.인정업체')[0]
  diameters=[float(n.replace(',','')) for n in re.findall(r'(\d[\d.,]*)㎜이하',table)]
 elif item['group']!='bundled-pipes':diameters=diameters[:1]
 opening=compact(steps[0]['text'])
 w=number(opening,r'가로(\d[\d.,]*)㎜');h=number(opening,r'세로(\d[\d.,]*)㎜');d=number(opening,r'직경(\d[\d.,]*)㎜')
 # Geometry represents the first illustrated installation option, with exact original instructions available beside it.
 geometry={'orientation':'floor' if '바닥' in item['title'] else 'wall','pipeMaterial':'pvc' if cert.startswith('FS-NP') else 'copper' if cert.startswith('FS-OS') else 'steel','diametersMm':diameters,'openingMm':{'width':w,'height':h,'diameter':d},'faces':[-1] if '하부시공' in item['title'] else [1] if '바닥' in item['title'] and not '상하부' in item['title'] else [1,-1]}
 boards=[st for st in steps if st['kind']=='board']
 if boards:
  cb=compact(boards[0]['text']);geometry['boardMm']={'width':number(cb,r'가로(\d[\d.,]*)㎜'),'halfHeight':number(cb,r'세로(\d[\d.,]*)㎜'),'thickness':boards[0]['thicknessMm']}
 materials=list(dict.fromkeys(re.findall(r'(?:SFB|SFBA|SFBI|SFI|SFS)-\d+[A-Z]*',c)))
 record={'id':cert,'category':GROUPS[item['group']],'title':item['title'],'code':code,'pdf':item['file']['href'],'drawingPage':4,'specPage':steps[0]['page'],'materials':materials,'geometry':geometry,'steps':steps,'sourceNote':'인정서의 첫 번째 시공 순서도 기준. 배열과 상대 크기는 시공 순서를 설명하는 모형이며 세부 치수·적용 조건은 원문을 따릅니다.'}
 # The 2023 drawings use 700 + 300 mm segments per layer (not four layers).
 if cert in ['FS-MP23-1103-3','FS-MP23-1103-2']:
  wraps=[st for st in steps if st['kind']=='blanket']
  assert len(wraps)==4
  for n,st in enumerate(wraps):st.update({'layer':n//2+1,'offsetMm':700 if n%2 else 0,'lengthMm':300 if n%2 else 700})
 if cert=='FS-NP25-0224-05':
  for st in steps:
   if st['kind'] in ['jacket','brackets']:st['faces']=[-1]
 records.append(record)
 audit.append({'id':cert,'pdf':item['file']['href'],'sha256':hashlib.sha256((ROOT/item['file']['href']).read_bytes()).hexdigest(),'steps':len(steps),'pages':sorted(set(st['page'] for st in steps))})
assert len(records)==60
(ROOT/'assets/data/installation-certificates.json').write_text(json.dumps({'version':'20261105r3','certificates':records},ensure_ascii=False,indent=2)+'\n')
(Path(__file__).parent/'certificate-sources.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'certificates':len(records),'steps':sum(len(r['steps']) for r in records),'groups':{g:sum(r['category']==g for r in records) for g in GROUPS.values()}},ensure_ascii=False))
for r in records:print(r['id'],r['geometry']['diametersMm'],r['geometry']['openingMm'])
