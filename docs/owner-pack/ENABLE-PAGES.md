# Owner action 1/3 — Pages enablement (KA / EN, NOT YET EXECUTED)

**Prerequisites / წინაპირობა:** Claude/owner-phase explicit GO and separately signed SEC-04 security review. Current public docs CI success alone is NOT that GO.

**KA — owner-ის ნაბიჯი (≤10 წუთი):**
1. გახსენით [GitHub public repo](https://github.com/dol-1/suliko-ide-ci) → Settings → Pages → Build and deployment; Source მიუთითეთ **GitHub Actions**. არ აირჩიოთ გაუმართლებელი branch-publication.
2. Settings → Secrets and variables → Actions → Variables → შექმენით/განაახლეთ არასაიდუმლო repository variable **`PAGES_ENABLED`** მნიშვნელობით **`true`** (არ ჩაწეროთ token/საიდუმლო).
3. ეს მხოლოდ მომდევნო **reviewed push on `main`** დროს აძლევს `.github/workflows/d062-docs.yml`-ს უფლებას გადაამოწმოს Pages API და ააგოს საიტი; green `workflow_dispatch` *არ* ნიშნავს deploy-ს, რადგან deploy-ს explicit main push სჭირდება. შეამოწმეთ Actions-ის deploy და ოფიციალური Pages URL. თუ Pages workflow ვერ დადასტურდა — იგი უსაფრთხოდ SKIP-ს აკეთებს.

**EN:** After explicit phase/SEC-04 signoff: configure GitHub Settings → Pages → Source **GitHub Actions**; add Actions repository variable `PAGES_ENABLED=true`; on the next reviewed **main push**, `.github/workflows/d062-docs.yml` will build, check API and deploy only if workflow-mode Pages is valid. Review its run before claiming that the user guide is live. No credentials needed in the variable.

**Exact files:** `.github/workflows/d062-docs.yml`, `site/mkdocs.yml`, `site/docs/index.ka.md`, `site/docs/index.md`. **Source:** [public reviewed workflow](https://github.com/dol-1/suliko-ide-ci/blob/main/.github/workflows/d062-docs.yml).
