from pathlib import Path
from urllib.parse import urlsplit, unquote
import re, json, hashlib, shutil, subprocess

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
package = Path('/tmp/doenc-package-20261110-shutter')
deployed = Path('/tmp/doenc-pages-20261110-shutter')
backup = Path(json.loads((out/'backup.json').read_text())['path'])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
before = {p: sha(deployed/p) for p in subprocess.check_output(['git','ls-files','-z'],cwd=deployed).decode().split('\0') if p}
files = [p for p in package.rglob('*') if p.is_file()]
changed, references = [], 0
for p in files:
    rel = p.relative_to(package)
    assert not any(part in ('자료','docs','company-promo','.local-backups','concepts') for part in rel.parts), str(rel)
    if p.suffix in ('.html','.css','.js'):
        content = p.read_text()
        if p.suffix == '.html': values = re.findall(r'(?:href|src|poster)=[\"\']([^\"\']+)',content)
        elif p.suffix == '.css': values = re.findall(r'url\([\"\']?([^\)\"\']+)',content)
        else: values = re.findall(r'(?:from\s*|import\s*\(?)[\"\'](\.[^\"\']+)[\"\']',content)
        for value in values:
            u = urlsplit(value)
            if u.scheme or u.netloc or not u.path or u.path.startswith('/') or '$' in u.path: continue
            assert (p.parent/unquote(u.path)).exists(), f'{rel}: missing {value}'
            references += 1
    if before.get(rel.as_posix()) != sha(p): changed.append(rel.as_posix())
pdfs = list((package/'company-site/assets/downloads').rglob('*.pdf'))
assert len(pdfs) == 66
preserved = [n for n in before if n.startswith(('company-site/assets/downloads/', 'company-site/assets/images/'))]
for n in preserved: assert sha(package/n) == before[n], n
release = json.loads((package/'company-site/release.json').read_text())
assert release['source_commit'] == subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()
assert release['published_shutter_certificates'] == 5
assert 'signatureShutterWatch' not in (package/'company-site/index.html').read_text()
assert sha(package/'company-site/assets/media/hero/shutter-wire-photo.jpg') == json.loads((out/'backup.json').read_text())['source_sha256']
for rel in changed:
    target = deployed/rel
    if target.exists():
        saved = backup/'previous-public'/rel
        saved.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(target,saved)
    target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(package/rel,target)
for rel,digest in before.items():
    if rel not in changed: assert sha(deployed/rel) == digest
result = dict(passed=True,source_commit=release['source_commit'],package_files=len(files),checked_references=references,changed_runtime_files=changed,preserved_certificates_and_images=len(preserved),published_certificates=len(pdfs),all_other_deployed_files_preserved=True,sha256={p.relative_to(package).as_posix():sha(p) for p in files})
(out/'package-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='sha256'},ensure_ascii=False,indent=2))
