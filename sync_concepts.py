#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_concepts.py
Integrates all 10 high-yield concepts from chem_master_data.json
into backend/concept_tree.json and chemclash/src/data/organic_db.json.
"""

import io
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "buffer") and (sys.stdout.encoding or "").lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

root_dir = Path(__file__).parent
master_path = root_dir / "chem_master_data.json"
tree_path = root_dir / "backend" / "concept_tree.json"
frontend_db_path = root_dir / "chemclash" / "src" / "data" / "organic_db.json"
root_db_path = root_dir / "organic_db.json"

with master_path.open(encoding="utf-8") as f:
    master_data = json.load(f)

# 1. Sync into backend concept_tree.json
with tree_path.open(encoding="utf-8") as f:
    modules = json.load(f)

existing_mod_ids = {m["module_id"] for m in modules}
new_modules = []

for c in master_data["concepts"]:
    cid = c["concept_id"]
    if cid in existing_mod_ids:
        continue

    diff = "medium"
    tier = 2
    if "sn2" in cid or "sn1" in cid or "markovnikov" in cid:
        diff = "basics"
        tier = 1
    elif "eas" in cid or "rearrangement" in cid or "aldol" in cid:
        diff = "advanced"
        tier = 3

    mod = {
        "module_id": cid,
        "title": c["title"],
        "difficulty": diff,
        "difficulty_tier": tier,
        "game_tags": [t.lower().replace(" ", "_") for t in c.get("tags", [])],
        "tutorial_sequence": [
            {
                "slide": 1,
                "concept_term": "Core Mechanism Rule",
                "short_definition": c["core_rule"],
                "action_prompt": f"Review the fundamental rule of {c['title']}."
            },
            {
                "slide": 2,
                "concept_term": "Exam Edge-Case & Common Exception",
                "short_definition": c["common_exception"],
                "action_prompt": "Memorise this high-yield trap tested in JEE Advanced and NEET."
            },
            {
                "slide": 3,
                "concept_term": "Key Keywords & Diagnostic Triggers",
                "short_definition": "Keywords: " + " · ".join(c.get("tags", [])),
                "action_prompt": "Identify the reaction conditions and solvent environment required for this pathway."
            }
        ]
    }
    new_modules.append(mod)

merged_modules = modules + new_modules
with tree_path.open("w", encoding="utf-8") as f:
    json.dump(merged_modules, f, indent=2, ensure_ascii=False)

print(f"[OK] backend/concept_tree.json updated with {len(new_modules)} new concepts (Total: {len(merged_modules)} modules)")

# 2. Sync into organic_db.json (both root and frontend)
for db_file in [root_db_path, frontend_db_path]:
    if db_file.exists():
        with db_file.open(encoding="utf-8") as f:
            db_json = json.load(f)
    else:
        db_json = {}

    existing_concepts = {item.get("concept") for item in db_json.get("core_concepts", [])}
    
    for c in master_data["concepts"]:
        title = c["title"]
        if title not in existing_concepts:
            db_json.setdefault("core_concepts", []).append({
                "concept": title,
                "details": f"{c['core_rule']} EXCEPTION/TRAP: {c['common_exception']} KEYWORDS: {' · '.join(c.get('tags', []))}"
            })
            existing_concepts.add(title)

    with db_file.open("w", encoding="utf-8") as f:
        json.dump(db_json, f, indent=4, ensure_ascii=False)

    print(f"[OK] {db_file.name} updated (Total Core Concepts: {len(db_json.get('core_concepts', []))})")
