#!/usr/bin/env python3
"""Check public docs source set, private references, local Markdown links and KA text."""
import re
from pathlib import Path
from urllib.parse import unquote

root = Path("site/docs")
expected = ["index", "install", "first-steps", "web", "remote", "privacy", "troubleshooting", "pilot"]
for stem in expected:
    for lang in ("en", "ka"):
        name = "index.md" if stem == "index" and lang == "en" else f"{stem}.{lang}.md"
        page = root / name
        assert page.exists() and page.stat().st_size > 200, f"missing or too short: {name}"
        text = page.read_text(encoding="utf-8")
        assert text.startswith("# "), f"no headline: {name}"
        assert not any(secret in text.lower() for secret in [
            "gitlab.com/dol-1-group/suliko-ide", "claude directives", "chatgpt-operating-manual",
            "sk-test-", "api_key=", "token=", "private roadmap"
        ]), f"private token/reference: {name}"
        if lang == "ka":
            georgian = sum("\u10d0" <= char <= "\u10ff" for char in text)
            assert georgian >= 80, f"Georgian content missing: {name}"
            assert "\ufffd" not in text, f"invalid UTF-8 substitution: {name}"
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
            target = unquote(target.split("#", 1)[0])
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            assert (page.parent / target).exists(), f"broken local link in {name}: {target}"
print("Public docs pages present, local links valid, basic Georgian text and private-reference guards passed.")
