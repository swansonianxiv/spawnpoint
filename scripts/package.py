#!/usr/bin/env python3
"""Package the buildless source and a permission-free Chromium new-tab extension."""
from pathlib import Path
import argparse
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = ['index.html', 'style.css', 'app.js', 'data.js', 'defaults.js', 'icons.js', 'wallpaper.js', 'favicon.svg']

def write_zip(destination, files):
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in sorted(files.items()):
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 20, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, content)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'releases')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    source = {}
    for path in ROOT.rglob('*'):
        relative = path.relative_to(ROOT)
        if path.is_file() and not any(part in {'.git', '.openai', 'node_modules', 'releases', '__pycache__'} for part in relative.parts) and path.name != '.DS_Store' and path.suffix != '.zip':
            source[str(Path('spawnpoint') / relative)] = path.read_bytes()
    write_zip(args.output / 'spawnpoint-source.zip', source)
    extension = {name: (ROOT / name).read_bytes() for name in RUNTIME}
    extension['THIRD_PARTY_NOTICES.txt'] = (ROOT / 'THIRD_PARTY_NOTICES.txt').read_bytes()
    extension['manifest.json'] = (json.dumps({
        'manifest_version': 3,
        'name': 'Spawnpoint',
        'version': '0.1.0',
        'description': 'A quiet, personal new-tab page.',
        'chrome_url_overrides': {'newtab': 'index.html'},
        'content_security_policy': {'extension_pages': "script-src 'self'; object-src 'none'"}
    }, indent=2) + '\n').encode()
    write_zip(args.output / 'spawnpoint-chromium.zip', extension)
    for name in ['spawnpoint-source.zip', 'spawnpoint-chromium.zip']:
        with zipfile.ZipFile(args.output / name) as archive:
            assert archive.testzip() is None
        print(args.output / name)

if __name__ == '__main__':
    main()
