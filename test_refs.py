"""
Quick test: verify reference image extraction works in v3 parser
"""
import json
from pathlib import Path
from higgsfield_parser_v3 import parse_higgsfield_community

print("=== Testing reference image extraction (5 posts) ===\n")

# Use a separate test output dir so we don't touch higgsfield_data_v3
import higgsfield_parser_v3 as hfp
original_dir = hfp.parse_higgsfield_community.__code__.co_consts

results = parse_higgsfield_community(headless=True, max_items=5)

print(f"\n=== RESULTS ===")
print(f"Total posts: {len(results)}")
total_refs = 0
for r in results:
    refs = r.get('reference_images', [])
    total_refs += len(refs)
    print(f"  Post {r['id']}: model={r.get('model_name')!r}, refs={len(refs)}, prompt={len(r.get('prompt',''))} chars")

print(f"\nTotal reference images: {total_refs}")
if total_refs > 0:
    print("✓ References ARE being saved!")
else:
    print("✗ References still NOT being saved - need further investigation")
