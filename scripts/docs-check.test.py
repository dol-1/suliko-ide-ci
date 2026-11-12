#!/usr/bin/env python3
"""Negative security regressions for the public-only MkDocs source validator."""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
validator = repository / "scripts/docs-check.py"
site = repository / "site"

def fixture(mutator=None):
    with tempfile.TemporaryDirectory(prefix="d062-public-doc-") as folder:
        root = Path(folder)
        shutil.copytree(site, root / "site")
        if mutator is not None:
            mutator(root)
        result = subprocess.run([sys.executable, str(validator)], cwd=root,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                timeout=20, check=False)
        return result.returncode

assert fixture() == 0, "Public documentation baseline unexpectedly failed"
def append_index(root, extra):
    page = root / "site/docs/index.md"
    page.write_text(page.read_text(encoding="utf-8") + "\n" + extra + "\n", encoding="utf-8")
assert fixture(lambda root: append_index(root, "[unsafe](javascript:alert(1))")) != 0, "Javascript link accepted"
def escaped(root):
    (root / "outside.txt").write_text("FOREIGN", encoding="utf-8")
    append_index(root, "[unsafe](../../outside.txt)")
assert fixture(escaped) != 0, "Out-of-tree local link accepted"
assert fixture(lambda root: append_index(root, "[unsafe](https://%67itlab.com/dol-1-group/suliko-ide)")) != 0, "Encoded private repo URL accepted"
def symlinked(root):
    page = root / "site/docs/install.en.md"
    outside = root / "external.md"
    outside.write_text("# External\n" + "No real secrets. " * 35, encoding="utf-8")
    page.unlink()
    page.symlink_to(outside)
assert fixture(symlinked) != 0, "Public source symlink accepted"
print("D062 public docs baseline and 4 negative protocol/path/private-URL/symlink regressions PASS.")
