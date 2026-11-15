# Owner action 2/3 — approved immutable RC tag and SHA (KA / EN, NOT YET EXECUTED)

**Prerequisites:** independently signed SEC-04 approval, exact-source all three native GUI CI GREEN and Claude's explicit owner-phase GO. Candidate tarball SHA-256 is **not** the Git commit SHA and is **not** approval.

**KA:**
1. Reviewer-ის წერილობითი GO-ის შემდეგ GitLab-ის კანონიკურ პროექტში `dol-1-group/suliko-ide-ci` წინასწარ შეამოწმეთ დამტკიცებული ზუსტი **40-სიმბოლოიანი commit SHA** (არ აგერიოთ 64-სიმბოლოიან კანდიდატის SHA-256-ში). მხოლოდ იმ რევიზიაზე შექმენით **lightweight**, უცვლელი Git tag `suliko-hello/v0.1.0-rc.1` (არაფერს გადააწეროთ/გადაადგილოთ). GitLab push mirror-ს უნდა შეეძლოს ამ ზუსტი tag-ის საჯარო GitHub-ზე გამოტანა; წაიკითხეთ canonical vs public mirrored SHA.
2. იმავე დამტკიცებულ 40-სიმბოლოიან commit SHA-ს ცალკე განხილული MR-ით ჩაწერთ `marketplace/rc/EXPECTED_SHA`-ში, რომელიც ახლა კანონიერად **`UNSET`** არის. საჭიროა source peer-review + CI, არა თვითნებური გამოცვლა.
3. გაშვებისას `.github/workflows/spike04-marketplace-rc.yml` საკუთარ `rc-gate`-ში ამოწმებს `suliko-hello/v0.1.0-rc.1` საჯარო mirrored tag-ს ზუსტად ამ SHA-ზე, შემდეგ რეალურ Desktop/Web CI სმოუკს; GREEN **არ** ნიშნავს საჯარო release/beta. ნეგატივზე არ შეცვალოთ gate, შეწყვიტეთ და დააბრუნეთ review-ზე.

**EN:** Only after independently signed review, (1) tag the separately approved canonical 40-character Git commit **once**, with the exact lightweight tag `suliko-hello/v0.1.0-rc.1`; verify it mirrors unchanged, (2) approve a separate MR updating `marketplace/rc/EXPECTED_SHA` from `UNSET` to that *commit* SHA, not the RC candidate SHA256; (3) run/inspect `.github/workflows/spike04-marketplace-rc.yml` with its exact public tag + expected commit SHA and real Desktop/Web smoke gate. Do not use an unapproved candidate `EXPECTED_SHA.candidate` value as the tag reference or mark CI as release permission.

**Exact files:** `marketplace/rc/EXPECTED_SHA`, `marketplace/rc/EXPECTED_SHA.candidate`, `marketplace/rc/marketplace.json`, `.github/workflows/spike04-marketplace-rc.yml`. Source: [D117 tag-gated workflow](https://github.com/dol-1/suliko-ide-ci/blob/main/.github/workflows/spike04-marketplace-rc.yml).
