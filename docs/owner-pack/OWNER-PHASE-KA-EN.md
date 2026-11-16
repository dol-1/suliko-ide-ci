# Suliko IDE — owner phase checklist (KA/EN)

**Status: prepared, NOT authorized to publish or share.** Owner has selected GitHub Pages Source = GitHub Actions; the reviewed immutable `suliko-hello/v0.1.0-rc.1` tag now exists at `1c7470934ab694ce69ac92e70de300d6f6c50743`. However live Pages URL, tag-specific D166, the separate `EXPECTED_SHA` gate, personal outreach and public beta are **not yet verified/approved**. Exactly three owner-phase actions remain in this order. A green build alone is not permission to publish.

| # | Action / ქმედება | Readiness gate | Owner instructions |
| --- | --- | --- | --- |
| 1 | Pages enablement / საიტის ჩართვა | SEC-04 and owner-phase GO | [ENABLE-PAGES.md](ENABLE-PAGES.md) |
| 2 | One immutable RC tag + approved commit `EXPECTED_SHA` | SEC-04 signed + D174 green + release review | [RC-TAG-EXPECTED-SHA.md](RC-TAG-EXPECTED-SHA.md) |
| 3 | Share one opt-in form link / ერთი ბმულის გაზიარება | public beta GO and Pages+RC verified | [SHARE-LINK.md](SHARE-LINK.md) |

**KA:** ყველა მოქმედება მხოლოდ owner-ის ფიზიკური ნაბიჯია; ChatGPT/Claude ამას ავტომატურად არ ასრულებს. თუ პირველი/მეორე gate წითელია, შემდეგ ნაბიჯზე არ გადახვიდეთ.

**EN:** These are preparation cards, not a permission to flip switches. No secrets are part of these instructions. Refuse a release request if any source review, public CI, digest provenance, publisher-signing caveat, or SEC-04 gate is unresolved.
