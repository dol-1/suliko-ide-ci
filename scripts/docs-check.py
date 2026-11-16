#!/usr/bin/env python3
"""Check public docs source set, private references, local Markdown links and KA text."""
import re
from pathlib import Path
from urllib.parse import unquote

root = Path("site/docs")
assert root.is_dir() and not root.is_symlink(), "unsafe public docs directory"
expected = ["index", "install", "first-steps", "faq", "web", "remote", "privacy", "troubleshooting", "pilot", "pilot-metrics", "windows-trust"]
config = Path("site/mkdocs.yml").read_text(encoding="utf-8")
for stem in expected:
    for lang in ("en", "ka"):
        name = "index.md" if stem == "index" and lang == "en" else f"{stem}.{lang}.md"
        assert name in config, f"KA/EN nav parity missing: {name}"
        page = root / name
        assert not page.is_symlink(), f"linked public docs source refused: {name}"
        assert page.exists() and page.is_file() and page.stat().st_size > 200, f"missing or too short: {name}"
        text = page.read_text(encoding="utf-8")
        assert text.startswith("# "), f"no headline: {name}"
        decoded_text = unquote(unquote(text)).lower()
        assert not any(secret in decoded_text for secret in [
            "gitlab.com/dol-1-group/suliko-ide", "claude directives", "chatgpt-operating-manual",
            "sk-test-", "api_key=", "token=", "private roadmap"
        ]), f"private token/reference: {name}"
        if stem == "pilot-metrics":
            banner = "SYNTHETIC EXAMPLE" if lang == "en" else "სინთეტიკური მაგალითი"
            assert banner.lower() in text.lower(), f"pilot template must clearly mark synthetic data: {name}"
            assert "SYN-DEMO-01" in text and "SYN-001" in text, f"pilot sample must be fake: {name}"
            # A public pilot example must never contain a contact address or host home path.
            assert not re.search(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", text), f"personal contact in pilot template: {name}"
            assert not re.search(r"/home/[A-Za-z0-9._-]+/", text), f"private home path in pilot template: {name}"
        if lang == "ka":
            georgian = sum("\u10d0" <= char <= "\u10ff" for char in text)
            assert georgian >= 80, f"Georgian content missing: {name}"
            assert "\ufffd" not in text, f"invalid UTF-8 substitution: {name}"
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
            # Decode percent-encoding (including double encoding) BEFORE policy.
            target = unquote(unquote(target.split("#", 1)[0]))
            if not target:
                continue
            lower = target.lower()
            assert not lower.startswith(("javascript:", "data:", "file:", "//")), f"unsafe public docs link: {name}"
            if lower.startswith(("http://", "https://", "mailto:")):
                continue
            assert not target.startswith("/") and ":" not in target.split("/", 1)[0], f"unsafe local link: {name}"
            candidate = page.parent / target
            assert not candidate.is_symlink(), f"linked local docs target refused: {name}"
            resolved = candidate.resolve()
            assert resolved.is_relative_to(root.resolve()), f"docs link escapes public source root: {name}"
            assert resolved.exists(), f"broken local link: {name}"
print("Public docs pages present, local links valid, basic Georgian text and private-reference guards passed.")
