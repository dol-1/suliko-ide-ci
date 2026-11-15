# D-196 — pilot onboarding support replies KA/EN (PRE-BETA DRAFT)

**No invitations or messages have been sent.** These are reusable *drafts*, not an actual support service or published beta. Use only after independent SEC04 and an explicit owner pilot GO. Do not request or publish access keys, home paths, private screenshots, user names/emails, real device IDs, provider identifiers, logs or personal workspace data. The `scripts/suliko-doctor.mjs` tool currently reads **synthetic fixtures only**, not a real installation; its sanitized bundle is NOT proof of an actual user machine's state. Never ask a pilot to copy an unsanitized diagnostic bundle or expose a service publicly.

## 1. Wrong BB version (doctor fixture: version unknown/mismatch)

**KA:** „თუ აპი არ ემთხვევა BB-ის შემოწმებულ **0.49.0** ვერსიას, ექსპერიმენტული Suliko-ს დაყენება არ სცადოთ. ოფიციალურ ვერსიას გადაამოწმეთ BB-ის გამოცემის გვერდზე. ამ ეტაპზე doctor მხოლოდ სინთეტიკურ ჩანაწერს ამოწმებს; არ გამოგვიგზავნოთ ლოგი, ფაილის გზა ან ანგარიშის მონაცემები. მოგვწერეთ მხოლოდ ზოგადი შეცდომის კატეგორია.“

**EN:** “If BB does not match the reviewed **0.49.0**, don't run an experimental Suliko install. Refer to BB's official release page. Doctor currently inspects synthetic fixtures only, not your machine. Please share only a generic error category—not logs, paths, account data or screenshots.”

## 2. Non-loopback listener (doctor fixture: listener policy fails closed)

**KA:** „თუ უსაფრთხოების შემოწმება აჩვენებს არასასურველ ქსელურ მისამართს, არ გამოაქვეყნოთ BB-ის პორტი, არ გახსნათ firewall და არ გადამისამართოთ სერვისი ინტერნეტში. გაიარეთ მხოლოდ დოკუმენტირებული ადგილობრივი loopback შემოწმება იზოლირებულ გარემოში. რეალური IP ან ქსელის კონფიგურაცია საჯარო issue-ში არ ჩაწეროთ.“

**EN:** “If a listener check indicates an unexpected address, do not expose the BB port or change firewall/router rules to make it reachable. The intended boundary is local loopback in an isolated setup. Don't post real IPs or network configuration to public issues.”

## 3. Suliko Hello missing or prohibited plugin enabled (doctor fixture: plugin state)

**KA:** „თუ Hello პანელი არ ჩანს ან რაიმე აკრძალული stock-პლაგინი ჩართულია, არ სცადოთ ხელით უცნობი პლაგინის ძალით ჩართვა. შეამოწმეთ მხოლოდ ოფიციალური BB-ისა და Suliko-ს სანდო ინსტრუქციები. შეგვატყობინეთ მხოლოდ 'Hello არ ჩანს' ან 'plugin-state mismatch' — სახელების, ფაილებისა და სამუშაო პროექტების გამჟღავნების გარეშე.“

**EN:** “If Hello is missing or a forbidden stock plugin appears enabled, don't force-install or reenable unknown plugins. Review official BB and approved Suliko instructions only. Report just ‘Hello absent’ or ‘plugin-state mismatch’ without sharing private projects or file listings.”

## 4. Provider key missing (doctor fixture: Boolean presence only)

**KA:** „თუ სინთეტიკურ დიაგნოსტიკაში provider-ის გასაღების არსებობა უარყოფითია, **არ გამოაგზავნოთ თვითონ გასაღები** ან მისი ნაწილი, არც საჯარო issue-ში, არც support ტექსტში. მომავალში დაამატეთ გასაღები მხოლოდ BB-ის ოფიციალურ ლოკალურ პარამეტრებში და მხოლოდ პროდუქტის დამტკიცების შემდეგ; ახლა პირადი ინფრასტრუქტურის მონაცემები საჭირო არ არის.“

**EN:** “If a synthetic provider-key-presence check is false, **never send the key or part of it** in an issue or a support message. A future approved pilot would configure secrets only through the official BB local settings; don't expose any credentials now.”

## 5. Doctor bundle rejected, redaction unknown or Windows trust warning

**KA:** „თუ bundle-ის შექმნა უარყოფილია, ვერსიის ტექსტი უცნობია ან Windows აჩვენებს **NotSigned/SmartScreen** გაფრთხილებას, არ გამორთოთ დაცვა და არ სცადოთ გაფრთხილების გვერდის ავლა. დღევანდელი doctor bundle მხოლოდ სინთეტიკურ fixture-ზე მუშაობს. არ ატვირთოთ რეალური bundle ან screenshot. მოგვწერეთ მხოლოდ 'bundle-redaction', 'unknown-version' ან 'publisher-trust' კატეგორია.“

**EN:** “If the bundle is rejected, version parsing is unknown, or Windows reports **NotSigned/SmartScreen**, do not disable protection or bypass warnings. Doctor currently produces synthetic-fixture-only bundles; never upload a real diagnostics bundle or private screenshot. Report only ‘bundle-redaction’, ‘unknown-version’ or ‘publisher-trust’ as a category.”

## Operators' answer discipline

These five categories derive from the current synthetic doctor fixture fields and known E1/SEC02/Windows limitations. **No automatic support replies, contact collection, real token transport, credential inspection or owner outreach.** Do not imply the customer has installed a signed or released Suliko package. Track aggregate synthetic categories only, not actual identities; support replies require independent SEC04 GO and an owner pilot invitation. Sources: [Claude #85 D196](https://gitlab.com/dol-1-group/suliko-ide/-/issues/85), [pilot kit #27](https://gitlab.com/dol-1-group/suliko-ide/-/issues/27), [doctor preview](../doctor/PREVIEW.md) and [E1 main source gate](https://github.com/dol-1/suliko-ide-ci/actions/runs/43743593613).
