from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen,Request
import json,hashlib
review=Path(__file__).resolve().parent;checks=json.loads((review/'package-checks.json').read_text());base='https://jay-source-2026.github.io/Jay-s-Repository/'
def verify(name):
 with urlopen(Request(base+name,headers={'Cache-Control':'no-cache'}),timeout=35) as r:body=r.read();status=r.status
 actual=hashlib.sha256(body).hexdigest();return {'path':name,'status':status,'expected':checks['sha256'][name],'sha256':actual,'matches':actual==checks['sha256'][name]}
with ThreadPoolExecutor(max_workers=4) as pool:files=list(pool.map(verify,checks['changed_runtime_files']))
result={'passed':all(f['status']==200 and f['matches'] for f in files),'files':files}
(review/'live-files.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'files':len(files),'mismatches':[f['path'] for f in files if not f['matches']]}));assert result['passed']
