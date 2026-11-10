from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,urllib.request
out=Path(__file__).resolve().parent
checks=json.loads((out/'package-checks.json').read_text())
base='https://jay-source-2026.github.io/Jay-s-Repository/'
def verify(name):
    with urllib.request.urlopen(base+name,timeout=40) as r:
        content=r.read();status=r.status
    assert status==200
    digest=hashlib.sha256(content).hexdigest()
    assert digest==checks['sha256'][name],name+' public content mismatch'
    return {'path':name,'status':status,'sha256':digest}
with ThreadPoolExecutor(max_workers=6) as pool:
    files=list(pool.map(verify,checks['changed_runtime_files']))
with urllib.request.urlopen(base+'company-site/release.json',timeout=40) as r: release=json.load(r)
assert release['source_commit']==checks['source_commit']
(out/'live-files.json').write_text(json.dumps({'passed':True,'source_commit':checks['source_commit'],'files':files},ensure_ascii=False,indent=2)+'\n')
print('Verified ordinary public URLs for',len(files),'changed files; release commit matches')
