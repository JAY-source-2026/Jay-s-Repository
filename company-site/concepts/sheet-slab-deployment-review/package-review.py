from pathlib import Path
from urllib.parse import urlsplit,unquote
import re,json,hashlib,shutil,subprocess

root=Path('/workspaces/Jay-s-Repository')
pkg=Path('/tmp/doenc-r2-package-20261106');deployed=Path('/tmp/doenc-pages-r2-20261106')
out=root/'company-site/concepts/sheet-slab-deployment-review'
backup=Path(json.loads((out/'backup.json').read_text())['path'])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before={p:sha(deployed/p) for p in subprocess.check_output(['git','ls-files','-z'],cwd=deployed).decode().split('\0') if p}
files=[p for p in pkg.rglob('*') if p.is_file()];changed=[];refs=0;unchanged=0
for p in files:
 rel=p.relative_to(pkg);name=rel.as_posix()
 assert not any(part in ('자료','docs','company-promo','.local-backups') for part in rel.parts)
 if p.suffix in ('.html','.css','.js'):
  text=p.read_text()
  if p.suffix=='.html':values=re.findall(r'(?:href|src|poster)=[\"\']([^\"\']+)',text)
  elif p.suffix=='.css':values=re.findall(r'url\([\"\']?([^\)\"\']+)',text)
  else:values=re.findall(r'(?:from\s*|import\s*\(?)[\"\'](\.[^\"\']+)[\"\']',text)
  for value in values:
   u=urlsplit(value)
   if u.scheme or u.netloc or not u.path or u.path.startswith('/') or '$' in u.path:continue
   assert (p.parent/unquote(u.path)).exists(),f'{name}: missing {value}';refs+=1
 if before.get(name)==sha(p):unchanged+=1
 else:changed.append(name)
pdfs=list((pkg/'company-site/assets/downloads').rglob('*.pdf'));assert len(pdfs)==61
images=[p for p in (pkg/'company-site/assets/images').rglob('*') if p.is_file()]
for p in pdfs+images:assert sha(p)==before[p.relative_to(pkg).as_posix()]
assert "a.href = '#contact'" in (pkg/'company-site/assets/js/explorer.js').read_text()
release=json.loads((pkg/'company-site/release.json').read_text());assert release['source_commit']=='aa96fe337d3c9ff20b058a030761c7f411f80724'
for rel in changed:
 target=deployed/rel
 if target.exists():
  copy=backup/'previous-public'/rel;copy.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,copy)
 target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(pkg/rel,target)
for rel,digest in before.items():
 if rel not in changed:assert sha(deployed/rel)==digest
result={'passed':True,'source_commit':release['source_commit'],'package_files':len(files),'checked_references':refs,'changed_runtime_files':changed,'unchanged_package_files':unchanged,'certificate_pdfs_preserved':len(pdfs),'images_preserved':len(images),'all_other_deployed_files_preserved':True,'sha256':{p.relative_to(pkg).as_posix():sha(p) for p in files}}
(out/'package-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='sha256'},ensure_ascii=False,indent=2))
