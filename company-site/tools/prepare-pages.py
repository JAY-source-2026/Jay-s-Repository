#!/usr/bin/env python3
"""Package a committed homepage for the existing GitHub Pages branch.

Only public application files are emitted. Private source folders stay local;
their public links lead to the existing contact section. The user-approved
firestop and fireproof certificate copies under assets/downloads/ are included
as ordinary public assets. Other original documents stay excluded.
"""
import argparse
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[2]
PRIVATE_PATH = re.compile(r"^assets/(?:자료/|docs/)")


def private_url(value):
    return bool(PRIVATE_PATH.match(unquote(urlsplit(value).path)))


def public_html(html):
    def replace_anchor(match):
        tag = match.group(0)
        href = re.search(r'\bhref="([^"]+)"', tag)
        if not href or not private_url(href.group(1)):
            return tag
        tag = tag.replace(href.group(0), 'href="#contact" title="제품·기술자료 문의"')
        return re.sub(r'\s+(?:target|rel)="[^"]*"', '', tag)
    html = re.sub(r'<a\b[^>]*>', replace_anchor, html)
    html = html.replace('제품 카탈로그 PDF', '제품 카탈로그 문의')
    html = html.replace('기술자료 PDF', '기술자료 문의')
    html = html.replace('· 도면 및 시방서</p>', '· 도면·시방서 문의</p>')
    # The existing public archive clip is the same full 47.29-second footage.
    html = html.replace('src="assets/자료/%EC%85%94%ED%84%B0%20%EC%98%81%EC%83%81.mp4"',
                        'src="assets/media/archive/shutter/screen-shutter.mp4"')
    return html


def public_explorer(script):
    marker = "  a.target = '_blank'; a.rel = 'noopener'; return a;"
    assert script.count(marker) == 1, 'Document-link function changed; review public fallback.'
    return script.replace(marker, """  // Original PDFs/PPTs are intentionally not part of the public package.
  const path = decodeURIComponent(new URL(href, location.href).pathname);
  if (/\\/assets\\/(?:자료|docs)\\//.test(path)) {
    a.href = '#contact'; a.title = '제품·기술자료 문의';
    if (text) a.textContent = text.replace(' ↗', '') + ' 문의 ↓';
    return a;
  }
""" + marker)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--ref', default='HEAD')
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        raise SystemExit('Choose a new output directory; existing files are never removed.')
    sha = subprocess.check_output(['git', 'rev-parse', args.ref + '^{commit}'], cwd=ROOT, text=True).strip()
    archive = subprocess.check_output(['git', 'archive', sha, 'company-site'], cwd=ROOT)
    files = []
    with tarfile.open(fileobj=io.BytesIO(archive)) as source:
        for member in source:
            if not member.isfile():
                continue
            path = Path(member.name)
            relative = path.relative_to('company-site')
            if '..' in path.parts or path.is_absolute():
                raise SystemExit('Invalid archive path')
            is_page = len(relative.parts) == 1 and relative.suffix == '.html'
            is_asset = relative.parts[0] == 'assets'
            if not (is_page or is_asset):
                continue
            if private_url(relative.as_posix()):
                raise SystemExit('Private source unexpectedly tracked: ' + relative.as_posix())
            # Generated masters and prompts belong to source history, not runtime.
            if relative.as_posix().startswith('assets/media/hero/') and relative.suffix in ('.png', '.json'):
                continue
            content = source.extractfile(member).read()
            if is_page:
                content = public_html(content.decode('utf-8')).encode('utf-8')
            if relative.as_posix() == 'assets/js/explorer.js':
                content = public_explorer(content.decode('utf-8')).encode('utf-8')
            target = output / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            files.append(path.as_posix())
    certificates = [p for p in files if p.startswith('company-site/assets/downloads/firestop-certificates/') and p.endswith('.pdf')]
    fireproof_certificates = [p for p in files if p.startswith('company-site/assets/downloads/fireproof-certificates/') and p.endswith('.pdf')]
    release = {'source_commit': sha, 'site': 'company-site', 'files': len(files),
               'original_documents': 'private source folders excluded; approved firestop and fireproof certificate copies included',
               'published_firestop_certificates': len(certificates),
               'published_fireproof_certificates': len(fireproof_certificates)}
    (output / 'company-site/release.json').write_text(json.dumps(release, indent=2) + '\n')
    (output / '.nojekyll').write_text('')
    print(json.dumps({'output': str(output), **release}, ensure_ascii=False))


if __name__ == '__main__':
    main()
