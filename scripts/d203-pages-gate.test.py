"""D203 static fail-closed check: Pages can deploy only by official API on main push."""
from pathlib import Path
import re

workflow = Path(".github/workflows/d062-docs.yml").read_text(encoding="utf-8")
owner_pack = Path("docs/owner-pack/ENABLE-PAGES.md").read_text(encoding="utf-8")

assert "vars.PAGES_ENABLED" not in workflow
assert "if: github.ref == 'refs/heads/main' && github.event_name == 'push'" in workflow
assert workflow.count("if: github.ref == 'refs/heads/main' && github.event_name == 'push'") == 3
assert "gh api --silent \"repos/$GITHUB_REPOSITORY/pages\"" in workflow
assert 'j.build_type==="workflow"' in workflow
assert 'j.html_url.startsWith("https://")' in workflow
assert 'enabled=false' in workflow
assert 'echo "enabled=$enabled" >> "$GITHUB_OUTPUT"' in workflow
assert "steps.pages_probe.outputs.enabled == 'true'" in workflow
assert "needs.site.outputs.deploy_enabled == 'true'" in workflow
assert "if: github.ref == 'refs/heads/main' && github.event_name == 'push' && needs.site.outputs.deploy_enabled == 'true'" in workflow
assert "PAGES_ENABLED" in owner_pack and "აღარ გჭირდებათ" in owner_pack
assert "https://github.com/dol-1/suliko-ide-ci/settings/pages" in owner_pack
assert not re.search(r"(?m)^\s*pull_request_target:", workflow)
print("D203 API-only main-push Pages gate + explicit disabled-SKIP and owner one-step contract PASS")
