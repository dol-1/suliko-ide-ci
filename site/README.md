# Docs site preview

Source: approved E5 D-062 project roadmap. **Public-only content**, no internal roadmap, risk matrix, private work items, BB source changes, secrets or release. Public pages in `site/docs`.

Build system: [Material for MkDocs 9.8.1](https://pypi.org/project/mkdocs-material/9.8.1/) (MIT, pinned direct dependency; transitive lock and licenses **not yet audited**). Material will reach [end of life 2027-05-05](https://squidfunk.github.io/mkdocs-material/getting-started/), so migrate to Zensical or other maintained static site generator before support ends.

CI builds with `mkdocs build --strict` and checks missing links, Unicode Georgian prose and prohibited private repo URLs. **Nothing is published to Pages** and no public site URL or live install is asserted until actual GitHub Pages configuration and deployment are verified. A future Pages workflow must have minimal `pages: write` / `id-token: write` permissions and require security review, no automatic force-push to `gh-pages` here.
