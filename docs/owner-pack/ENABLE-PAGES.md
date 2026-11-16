# Owner action 1/3 — Enable GitHub Pages (one step, KA / EN)

**Status:** Owner confirmed that Source = GitHub Actions was selected on 2026-11-15 (source: [owner phase #86](https://gitlab.com/dol-1-group/suliko-ide/-/issues/86#note_4240058417)). This document is a readiness checklist, **not proof that a live site is deployed**.

**KA — ერთადერთი ნაბიჯი:** გახსენით [GitHub → Settings → Pages](https://github.com/dol-1/suliko-ide-ci/settings/pages) და „Build and deployment“ → „Source“ აირჩიეთ **GitHub Actions**. უკვე არჩეულია? დამატებით არაფერს აკეთებთ. **`PAGES_ENABLED` ცვლადი აღარ გჭირდებათ.** არ შეიყვანოთ token ან საიდუმლო მონაცემები.

შემდეგ reviewed `main` push-ზე `.github/workflows/d062-docs.yml` თავად ამოწმებს GitHub-ის Pages API-ს (`build_type == workflow`) და მხოლოდ მისი დადებითი პასუხით ატვირთავს საჯარო KA/EN დოკუმენტაციას. თუ Pages ჯერ გამორთულია, მხოლოდ deploy გამოტოვდება; build/t tests დამოუკიდებლად გაგრძელდება. `workflow_dispatch` ან feature-branch CI-ის მწვანე შედეგი **არ ნიშნავს გამოქვეყნებას**.

**EN — single action:** Visit [GitHub → Settings → Pages](https://github.com/dol-1/suliko-ide-ci/settings/pages). Under Build and deployment, select **GitHub Actions** as Source; if already selected, nothing further is required. There is **no `PAGES_ENABLED` variable** to create or configure. Do not enter a token.

A reviewed `main` push probes the official Pages API for `build_type: workflow` and only then uploads the public docs and deploys. Disabled/invalid Pages is a safe **SKIP**, never a false success claim. Confirm the actual `deploy` job completed/success and the live KA/EN public URLs before sharing a pilot link. Remote documentation describes a synthetic **demo**, not production Remote authorization.

**Source:** [Claude D203 #87](https://gitlab.com/dol-1-group/suliko-ide/-/issues/87), [owner #86](https://gitlab.com/dol-1-group/suliko-ide/-/issues/86), [guarded docs CI](https://github.com/dol-1/suliko-ide-ci/blob/main/.github/workflows/d062-docs.yml).
