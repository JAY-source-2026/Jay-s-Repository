from pathlib import Path
from urllib.parse import urlsplit,unquote
import re,json,hashlib,shutil
pkg=Path('/tmp/doenc-r6-package-a620c16');deployed=Path('/tmp/doenc-pages-r6-a620c16');out=Path('/workspaces/Jay-s-Repository/company-site/concepts/model-fit-deployment-review')
files=[p for p in pkg.rglob('*') if p.is_file()];changed=[];unchanged=0;refs=0
assert len(files)>290
for p in files:
 rel=p.relative_to(pkg)
 assert not any(part in ('資料','자료','docs','company-promo','.local-backups')for part in rel.parts)
 if p.suffix in ('.html','.css','.js'):
  text=p.read_text()
  if p.suffix=='.html':values=re.findall(r'(?:href|src|poster)=[\"\']([^\"\']+)',text)
  elif p.suffix=='.css':values=re.findall(r'url\([\"\']?([^\)\"\']+)',text)
  else:values=re.findall(r'(?:from\s*|import\s*\(?)[\"\'](\.[^\"\']+)[\"\']',text)
  for v in values:
   u=urlsplit(v)
   if u.scheme or u.netloc or not u.path or u.path.startswith('/') or '$' in u.path:continue
   q=p.parent/unquote(u.path);assert q.exists(),f'{rel}: missing {v}';refs+=1
 target=deployed/rel
 if not target.exists() or p.read_bytes()!=target.read_bytes():changed.append(str(rel))
 else:unchanged+=1
pdfs=list((pkg/'company-site/assets/downloads').rglob('*.pdf'));assert len(pdfs)==61
for p in pdfs:assert p.read_bytes()==(deployed/p.relative_to(pkg)).read_bytes()
images=list((pkg/'company-site/assets/images').rglob('*'))
for p in images:
 if p.is_file():assert p.read_bytes()==(deployed/p.relative_to(pkg)).read_bytes()
assert len(re.findall(r"a\.target\s*=\s*'_blank'",(pkg/'company-site/assets/js/explorer.js').read_text()))==1
assert "a.href = '#contact'" in (pkg/'company-site/assets/js/explorer.js').read_text()
release=json.loads((pkg/'company-site/release.json').read_text());assert release['source_commit'].startswith('a620c16')
result={'passed':True,'source_commit':release['source_commit'],'package_files':len(files),'checked_references':refs,'changed_runtime_files':changed,'unchanged_package_files':unchanged,'certificate_pdfs_preserved':len(pdfs),'images_preserved':sum(p.is_file()for p in images),'all_other_deployed_files_preserved':True}
(out/'package-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for rel in changed:
 p=pkg/rel;t=deployed/rel;t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,t)
print(json.dumps(result,ensure_ascii=False,indent=2))
