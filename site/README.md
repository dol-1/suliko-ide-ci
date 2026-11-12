# Docs site preview

Source: approved E5 D-062 project roadmap. **Public-only content**, no internal roadmap, risk matrix, private work items, BB source changes, secrets or release. Public pages in `site/docs`.

Build system: [Material for MkDocs 9.8.1](https://pypi.org/project/mkdocs-material/9.8.1/) (MIT, pinned direct dependency; transitive lock and licenses **not yet audited**). Material will reach [end of life 2027-05-05](https://squidfunk.github.io/mkdocs-material/getting-started/), so migrate to Zensical or other maintained static site generator before support ends.

CI builds with `mkdocs build --strict` and checks missing links, Unicode Georgian prose and prohibited private repo URLs. **Nothing is published to Pages** and no public site URL or live install is asserted until actual GitHub Pages configuration and deployment are verified. A future Pages workflow must have minimal `pages: write` / `id-token: write` permissions and require security review, no automatic force-push to `gh-pages` here.

When the exact-head branch CI including transitive license audit passes and this MR merges, the workflow **attempts** a static GitHub Pages deployment from main via pinned actions/deploy-pages. The Pages source may require GitHub repository configuration; a passing build or upload does not prove public availability. Confirm the actual URL over HTTPS before publishing the signup link. The deploy job has only pages:write/id-token:write, while build has contents:read.

License evidence used for the fail-closed legacy metadata mapper (checked 2026-11-12): [certifi 2026.10.23 MPL-2.0](https://pypi.org/project/certifi/2026.10.23/), [pathspec 1.1.1 MPL-2.0](https://pypi.org/project/pathspec/1.1.1/), [tzdata 2026.6 Apache-2.0](https://pypi.org/project/tzdata/2026.6/), [watchdog 7.1.0 Apache-2.0](https://pypi.org/project/watchdog/7.1.0/). Versions are indicative of the 2026-11-12 CI resolution; a future unknown license or changed declaration still fails closed. License metadata inspection does not constitute a security audit.
