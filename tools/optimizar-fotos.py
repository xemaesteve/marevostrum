#!/usr/bin/env python3
"""Optimize photographic PNG data misnamed .jpg. Requires: pip install Pillow.

Default is a dry run. Use --apply to rewrite the listed files, keeping a local
backup outside the web root. Work from the repository root, on a separate branch.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from PIL import Image

PHOTOS = [
    "images/lifestyle/hero.jpg",
    "images/lifestyle/higuera.jpg",
    "images/lifestyle/noche.jpg",
    "images/apartamentos/perla/perla-hero-vistas.jpg",
    "images/apartamentos/perla/perla-1-nueva.jpg",
    "images/apartamentos/perla/cocina-perla.jpg",
    "images/apartamentos/perla/habitacion-perla-2.jpg",
    "images/apartamentos/perla/piscina-perla.jpg",
]

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Rewrite vetted PNG-as-JPG photos")
    parser.add_argument("--quality", type=int, default=84)
    args = parser.parse_args()
    if not 75 <= args.quality <= 95:
        parser.error("Quality must be between 75 and 95")
    total_original = total_optimized = 0
    for name in PHOTOS:
        path = Path(name)
        before = path.read_bytes()
        with Image.open(path) as image:
            image.load()
            if image.format != "PNG":
                print(f"SKIP (not PNG data): {path}")
                continue
            if "A" in image.getbands() or "transparency" in image.info:
                print(f"SKIP (transparent image): {path}")
                continue
            from io import BytesIO
            buf = BytesIO()
            image.convert("RGB").save(
                buf, format="JPEG", quality=args.quality,
                optimize=True, progressive=True, subsampling=0
            )
            after = buf.getvalue()
            with Image.open(BytesIO(after)) as test:
                test.verify()
            if len(after) >= len(before):
                print(f"SKIP (no size reduction): {path}")
                continue
            total_original += len(before)
            total_optimized += len(after)
            print(f"{path}: {len(before):,} -> {len(after):,} bytes")
            if args.apply:
                # Backups are outside the public repo. Never silently overwrite originals
                backup = Path.home() / "marevostrum-image-backups" / name
                backup.parent.mkdir(parents=True, exist_ok=True)
                if backup.exists():
                    raise RuntimeError(f"Backup already exists: {backup}")
                backup.write_bytes(before)
                path.write_bytes(after)
    print(f"Total for listed images: {total_original:,} -> {total_optimized:,} bytes")
    print("APPLIED with backups" if args.apply else "DRY RUN (no files changed)")

if __name__ == "__main__":
    main()
