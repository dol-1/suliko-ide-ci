# D239 rc.2 candidate dry-run — source-only, არ არის გამოშვება

**No public beta; no outreach; no new tag, release, signed installer, approval or production installation.** D239 on reviewed main `02544da33f784cc73e4daba09170ece3d30f8cd8`, immutable original rc.1 source `1c7470934ab694ce69ac92e70de300d6f6c50743`.

## English — changes since immutable rc.1 (source, not a new downloadable build)

- D198: current-user, synthetic CI-owned live diagnostic report and sanitized bundle, not participant data.
- D202: Windows owned NSIS uninstall exact SHA-bound marker and verified uninstaller digest/foreign file refusal, merged, source main postmerge 26/26 actual triggered CI GREEN.
- D217: exact-feature SHA affected workflow inventory and stronger three-platform native gating; no separate source tag made.
- Current `marketplace/rc/EXPECTED_SHA.candidate` remains `8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a` — **identical to rc.1 candidate**. Only a two-independent-builder actual GH run can certify the compared current archive. If the digest matches, rc.2 is **NOT** a distinct user binary or upgrade. Distinct digest requires new reviewer approval and a separate MR; never automatically tag.

## ქართული — მხოლოდ საინჟინრო შედარება

Windows-ის კუთვნილი ინსტალაციის წაშლას დაემატა SHA-256-ის დაცვის მოთხოვნა (D202); დიაგნოსტიკური ანგარიში რჩება მხოლოდ წაკითხვადი და სინთეტიკური (D198); CI ამოწმებს ცვლილებების სრულ შესაბამისობას ზუსტად იმავე commit-ზე (D217). ამ ცვლილებებმა **არ შექმნა** ახალი დამტკიცებული rc.2 პაკეტი. არსებული კანდიდატის ჰეში rc.1-ის იდენტურია; რეალური ორი დამოუკიდებელი builder-ის შედეგი ცალკე დასადასტურებელია. **არც ახალი ტეგი, არც საჯარო ბეტა, არც რეალური მომხმარებლების მოწვევა.**

Source: Claude #93 D239; D166 existing genuine 2-builder verification and unchanged immutability pins; D202 exact-main GitHub postmerge 26/26 only for triggered workflows (full D237 eligible set unresolved).
