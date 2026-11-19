from pathlib import Path
import json,hashlib,concurrent.futures,urllib.request,urllib.error
root=Path('/workspaces/Jay-s-Repository/company-site/concepts/shutter-cover-review');p=json.loads((root/'package-checks.json').read_text());base='https://jay-source-2026.github.io/Jay-s-Repository/'
def fetch(name):
 try:
  with urllib.request.urlopen(base+name,timeout=30) as response:return response.status,response.read()
 except urllib.error.HTTPError as e:return e.code,b''
def check(pair):
 name,digest=pair;code,data=fetch(name);assert code==200,(name,code);assert hashlib.sha256(data).hexdigest()==digest,name;return {'path':name,'status':code,'sha256_match':True}
def removed(name):
 code,_=fetch(name);assert code==404,(name,code);return {'path':name,'status':code}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 live=list(pool.map(check,p['sha256'].items()));gone=list(pool.map(removed,p['removed_files']))
result={'passed':True,'source_commit':p['source_commit'],'published':live,'removed':gone}
(root/'live-files.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':True,'published_files_matching':len(live),'old_urls_returning_404':len(gone),'source_commit':p['source_commit']}))
