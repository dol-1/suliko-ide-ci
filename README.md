# Suliko IDE — public CI mirror / საჯარო CI სარკე

> **Pre-release test infrastructure only. Not a production IDE, customer installer, signed release or public beta.**
> **მხოლოდ ექსპერიმენტული სატესტო ინფრასტრუქტურაა — არა საბოლოო პროდუქტი ან საჯარო ბეტა.**

## What this repository contains / რა არის აქ

This GitHub repository is a **public push mirror of canonical GitLab-reviewed changes**. It contains Suliko-owned experimental BB-compatible plugins, configuration, synthetic test fixtures, bilingual documentation source and GitHub Actions workflows. It must never contain user projects, provider keys, customer data, private planning or Remote backends. The public mirror is for verification; there is no independent GitHub production release pipeline.

ეს GitHub რეპოზიტორია GitLab-ში განხილული კოდის **საჯარო სარკეა**. აქ თავსდება მხოლოდ საკუთარი ექსპერიმენტული პლაგინები, კონფიგურაცია, სინთეტიკური ტესტები, KA/EN დოკუმენტაცია და GitHub Actions. რეალური მომხმარებლის მონაცემები, API გასაღებები, პირადი გეგმები და Remote-ის სერვერი აქ არ თავსდება.

## Testing and status / ტესტირება და მდგომარეობა

- CI uses **standard free public GitHub Actions runners** on Linux, macOS and Windows. A successful step on one OS is not proof that every OS, installer or feature works.
- The upstream BB version is pinned to **desktop-v0.49.0** for reviewed compatibility tests; no BB core is changed. An automated source scan does not substitute for an independent security review.
- A change is eligible for canonical main merge only after its **exact mirrored head SHA** has a completed successful run and a recorded premerge GitLab review note with the run ID, SHA and UTC completion time. No skipped/queued/red tests count as passing.
- **No published Suliko release or installer is authorized.** Integrated one-command 3-OS setup has passed genuine installed native GUI/SEC-02/user-data protection in synthetic free CI ([exact merged main D-174](https://github.com/dol-1/suliko-ide-ci/actions/runs/43743593613)); immutable RC tag, publisher signing, independent SEC-04 and public beta approval remain outstanding.

- CI მუშაობს მხოლოდ საჯარო უფასო სტანდარტულ Linux/macOS/Windows runner-ებზე. ერთი მწვანე ტესტი ყველა პლატფორმის მზადყოფნას არ ამტკიცებს.
- BB-ის სატესტო ვერსია ფიქსირებულია: **desktop-v0.49.0**. BB-ის ძირითად კოდს არ ვცვლით.
- მთავარ ბრენჩში გაერთიანებამდე აუცილებელია **ზუსტად იმავე SHA-ის** დასრულებული წარმატებული CI და GitLab MR-ში წინასწარ დაფიქსირებული მტკიცებულება.
- საჯარო რელიზი/ბეტა ჯერ არ არსებობს; საჭიროა სრულად ინტეგრირებული ინსტალაცია და დამოუკიდებელი უსაფრთხოების შემოწმება.

## Documentation / დოკუმენტაცია

Source for KA/EN documentation is in [site/docs](site/docs), with the verified MkDocs configuration in [site/mkdocs.yml](site/mkdocs.yml). GitHub Pages may not be enabled; the presence of documentation source does **not** guarantee a live published site.

KA/EN დოკუმენტაციის წყაროა [site/docs](site/docs). GitHub Pages-ის ჩართვა ჯერ არ არის დადასტურებული; მხოლოდ წყაროს არსებობა არ ნიშნავს, რომ საიტი საჯაროდ მუშაობს.

## Security and contributions / უსაფრთხოება და კონტრიბუცია

Please follow [SECURITY.md](SECURITY.md) for coordinated vulnerability reporting. Do **not** put security details, tokens, private data or exploit demonstrations in public issues. Private vulnerability reporting is available only if explicitly enabled by maintainers; no availability or response time is promised. For non-sensitive feedback and source contribution rules, read [CONTRIBUTING.md](CONTRIBUTING.md).

მოწყვლადობის შესახებ ინფორმაციისათვის იხილეთ [SECURITY.md](SECURITY.md). საჯარო issue-ში არ გამოაქვეყნოთ გასაღებები, პირადი მონაცემები, ექსპლოიტები ან არასაჯარო დეტალები. ჩვეულებრივი უკუკავშირისა და ცვლილებების წესებია [CONTRIBUTING.md](CONTRIBUTING.md).

## Licensing / ლიცენზია

**Public visibility is not a license grant for Suliko-original code.** Suliko-original licensing/redistribution requires a separately approved project license. The upstream BB project and other dependencies retain their own licenses. Do not assume this repository distributes or licenses BB upstream code.

**საჯარო ხილვადობა Suliko-ს საკუთარი კოდის გამოყენების ლიცენზიას არ ნიშნავს.** ლიცენზირება ცალკე დასამტკიცებელია; მესამე მხარის კომპონენტებზე მოქმედებს მათი საკუთარი პირობები.
