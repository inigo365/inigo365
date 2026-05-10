#!/usr/bin/env python3
"""
apply-template.py
Adds project-template.css and project-template.js links to every HTML file
in the projects/ folder if they are not already present.

CSS lives at:  <repo>/project-template.css
JS lives at:   <repo>/js/project-template.js

Relative paths from projects/<file>.html:
  CSS → ../project-template.css
  JS  → ../js/project-template.js
"""

import os
import re

PROJECTS_DIR = os.path.join(os.path.dirname(__file__), "projects")

CSS_HREF   = "../project-template.css"
JS_SRC     = "../js/project-template.js"

CSS_TAG    = f'<link rel="stylesheet" href="{CSS_HREF}">'
JS_TAG     = f'<script src="{JS_SRC}"></script>'

modified = []
skipped  = []

for filename in sorted(os.listdir(PROJECTS_DIR)):
    if not filename.endswith(".html"):
        continue

    filepath = os.path.join(PROJECTS_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    has_css = CSS_HREF in content
    has_js  = JS_SRC  in content

    if has_css and has_js:
        skipped.append(filename)
        continue

    # Insert CSS tag as last item before </head>
    if not has_css:
        content = content.replace("</head>", f"  {CSS_TAG}\n</head>", 1)

    # Insert JS tag immediately before </body>
    if not has_js:
        content = content.replace("</body>", f"<script src=\"{JS_SRC}\"></script>\n</body>", 1)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        modified.append(filename)
    else:
        skipped.append(filename)

print("=" * 50)
print("apply-template.py — results")
print("=" * 50)

if modified:
    print(f"\nModified ({len(modified)}):")
    for name in modified:
        print(f"  ✓  {name}")

if skipped:
    print(f"\nSkipped — already had template ({len(skipped)}):")
    for name in skipped:
        print(f"  –  {name}")

print(f"\nDone. {len(modified)} file(s) updated, {len(skipped)} skipped.")
