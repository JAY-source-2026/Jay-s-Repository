#!/usr/bin/env python3
"""Copy the five supplied shutter PDFs unchanged and render full-page previews."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys

sys.path.insert(0, '/tmp/doenc-doc-tools')
import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SITE = ROOT / 'company-site'
SOURCE = SITE / 'assets/자료/방화셔터 인정서'
DOWNLOADS = SITE / 'assets/downloads/shutter-certificates'
IMAGES = SITE / 'assets/images/certificates/shutter'
EVIDENCE = Path(__file__).resolve().parent / 'sources'
for directory in (DOWNLOADS, IMAGES, EVIDENCE):
    directory.mkdir(parents=True, exist_ok=True)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


manifest = {
    'generatedAt': '2026-11-09',
    'sourcePolicy': 'Supplied original PDFs copied byte-for-byte; all original pages retained. Preview images render complete physical PDF pages 1 and 3 without cropping or content edits. Titles follow source filenames with leading numbering removed.',
    'previewSettings': {'width': 1600, 'format': 'WebP', 'quality': 90, 'method': 6},
    'items': [],
}
for source in sorted(SOURCE.glob('*.pdf')):
    number = int(re.match(r'^(\d+)\)', source.name)[1])
    title = re.sub(r'^\d+\)\s*', '', source.stem)
    certificate = re.search(r'FDS-[A-Z]+\d{2}-\d{4}-\d+', source.stem)[0]
    target = DOWNLOADS / f'{certificate}.pdf'
    if target.exists() and digest(target) != digest(source):
        raise RuntimeError(f'Existing copy differs; refusing to replace: {target}')
    shutil.copyfile(source, target)
    document = pymupdf.open(source)
    first_text = document[0].get_text()
    drawing_text = document[2].get_text()
    assert f'인정번호 : {certificate}' in first_text, certificate
    assert certificate in drawing_text and '구조설명도' in drawing_text, certificate
    product = re.search(r'구조명 또는 제품명\s*:\s*([^\n]+)', first_text)[1].strip()
    previews = []
    for page_number, label in ((1, '인정서'), (3, '구조설명도')):
        page = document[page_number - 1]
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1600 / page.rect.width, 1600 / page.rect.width), alpha=False)
        page_image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
        if page_image.width != 1600:
            page_image = page_image.resize((1600, round(page_image.height * 1600 / page_image.width)), Image.Resampling.LANCZOS)
        preview_file = IMAGES / f'{certificate}-page-{page_number}.webp'
        page_image.save(preview_file, 'WEBP', quality=90, method=6)
        with Image.open(preview_file) as check:
            check.load()
            assert check.width == 1600 and check.height > 2000
        previews.append({
            'page': page_number,
            'src': str(preview_file.relative_to(SITE)),
            'width': page_image.width,
            'height': page_image.height,
            'label': f'{label} · {page_number}페이지',
        })
    original_hash, copied_hash = digest(source), digest(target)
    assert original_hash == copied_hash
    manifest['items'].append({
        'sourceNumber': number,
        'certificate': certificate,
        'title': title,
        'productName': product,
        'sourcePath': str(source.relative_to(ROOT)),
        'sourceSha256': original_hash,
        'copyPath': str(target.relative_to(ROOT)),
        'copySha256': copied_hash,
        'hashMatches': True,
        'pageCount': len(document),
        'file': {
            'name': title + '.pdf',
            'href': str(target.relative_to(SITE)),
            'size': f'{target.stat().st_size / (1024 * 1024):.2f} MB',
            'type': 'application/pdf',
            'pages': len(document),
        },
        'previews': previews,
        'inspection': {
            'certificateNumberMatchesFirstPage': True,
            'representativeDrawingPhysicalPage': 3,
            'drawingHeading': '정면도, 평면도' if '정면도, 평면도' in drawing_text else '입면도',
            'completePagesRendered': True,
        },
    })
    document.close()

assert len(manifest['items']) == 5
(EVIDENCE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
for page_number in (1, 3):
    sheet = Image.new('RGB', (5 * 480, 720), '#d9dfe6')
    draw = ImageDraw.Draw(sheet)
    for index, entry in enumerate(manifest['items']):
        preview = next(p for p in entry['previews'] if p['page'] == page_number)
        with Image.open(SITE / preview['src']) as im:
            im.thumbnail((460, 670), Image.Resampling.LANCZOS)
            sheet.paste(im, (index * 480 + (480 - im.width) // 2, 30))
        draw.text((index * 480 + 10, 8), entry['certificate'], fill='black')
    sheet.save(EVIDENCE / f'contact-page-{page_number}.jpg', quality=92)
print(json.dumps({'count': len(manifest['items']), 'pages': [i['pageCount'] for i in manifest['items']], 'allHashesMatch': all(i['hashMatches'] for i in manifest['items'])}))
