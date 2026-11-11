from pathlib import Path
from urllib.parse import urlsplit, unquote
import re,json,hashlib,shutil,subprocess
root=Path(__file__).resolve().parents[3];review=Path(__file__).resolve().parent
package=Path('/tmp/doenc-package-20261111-o-morph');deployed=Path('/tmp/doenc-pages-20261111-o-morph');backup=Path(json.loads((review/'before.json').read_text())['backup'])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before={name:sha(deployed/name) for name in subprocess.check_output(['git','ls-files','-z'],cwd=deployed).decode().split('\0') if name}
files=[p for p in package.rglob('*') if p.is_file()];changed=[];references=0
for p in files:
 rel=p.relative_to(package);name=rel.as_posix()
 assert not any(part in ['자료','docs','concepts','company-promo','.local-backups'] for part in rel.parts),name
 if p.suffix in ['.html','.css','.js']:
  content=p.read_text()
  if p.suffix=='.html':values=re.findall(r'(?:href|src|poster)=["\']([^"\']+)',content)
  elif p.suffix=='.css':values=re.findall(r'url\(["\']?([^\)"\']+)',content)
  else:values=re.findall(r'(?:from\s*|import\s*\(?|new URL\()["\'](\.[^"\']+)["\']',content)
  for value in values:
   u=urlsplit(value)
   if u.scheme or u.netloc or not u.path or u.path.startswith('/') or '$' in u.path:continue
   target=(p.parent/unquote(u.path)).resolve()
   privateRoots=[(package/'company-site/assets'/n).resolve() for n in ['docs','자료']]
   if any(target.is_relative_to(private) for private in privateRoots):
    assert 'Original PDFs/PPTs are intentionally not part of the public package.' in (package/'company-site/assets/js/explorer.js').read_text()
    continue
   assert target.exists(),f'{name}: missing {value}'
   references+=1
 if before.get(name)!=sha(p):changed.append(name)
allowed={'company-site/index.html','company-site/assets/js/explorer.js','company-site/assets/js/intro-boot.js','company-site/assets/css/brand-intro.css','company-site/release.json'}
assert all(n in allowed or n.startswith(('company-site/assets/js/brand-intro/','company-site/assets/media/intro/')) for n in changed),changed
preserved=[n for n in before if n.startswith(('company-site/assets/downloads/','company-site/assets/images/','company-site/assets/media/'))]
for name in preserved:assert sha(package/name)==before[name],name
pdfs=list((package/'company-site/assets/downloads').rglob('*.pdf'));assert len(pdfs)==66
old=(backup/'index.html').read_text();new=(package/'company-site/index.html').read_text()
extract=lambda text:text[text.index('        <section class="signature-hero"'):text.index('        <section class="intro-section"')]
assert extract(old)==extract(new),'Existing hero changed'
for name in changed:
 target=deployed/name
 if target.exists():
  save=backup/'previous-public'/name;save.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,save)
 target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(package/name,target)
for name,digest in before.items():
 if name not in changed:assert sha(deployed/name)==digest,name
release=json.loads((package/'company-site/release.json').read_text())
result={'passed':True,'source_commit':release['source_commit'],'package_files':len(files),'checked_references':references,'changed_runtime_files':changed,'preserved_media_and_certificates':len(preserved),'certificates':len(pdfs),'original_hero_html_identical':True,'unrelated_public_files_preserved':True,'sha256':{p.relative_to(package).as_posix():sha(p) for p in files}}
(review/'package-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='sha256'},ensure_ascii=False))
