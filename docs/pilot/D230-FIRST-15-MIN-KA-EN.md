# D230 FIRST-15-MIN KA/EN — 3OS synthetic rehearsal

Source: [Claude #92 D230](https://gitlab.com/dol-1-group/suliko-ide/-/issues/92), [D208 kit](D208-OWNER-FREE-15MIN-KIT.md). **NOT SENT; NO PARTICIPANTS, OUTREACH, LIVE REMOTE OR PUBLIC BETA**.

| ქართული | English | Strict CI proof |
| --- | --- | --- |
| 1. შეამოწმე rc.1 ტეგი და ჰეში | Verify immutable rc.1 tag and full SHA-256 | Official tag `1c7470934ab694ce69ac92e70de300d6f6c50743`; same SHA-256 `8ca5634595b0ed8d3f26719163dc63126a2aea92dff59f529bcd55b712f8af6a` from two independent source builds |
| 2. შეასრულე მხოლოდ შემოწმებული ინსტალაცია | Execute reviewed single-command setup | Linux/macOS `scripts/suliko-setup.sh --install --plugin-sha HASH --candidate-file FILE`; Windows `scripts/suliko-setup.ps1 -Install -AllowUnsignedVerified -PluginSha HASH -CandidateFile FILE` **only inside hosted disposable CI** |
| 3. შეამოწმე Hello | Verify own Hello in actual installed GUI | Real native installed Hello panel, strict disabled stock plugins and loopback-only |
| 4. გაუშვი doctor და redacted bundle | Read-only doctor and bounded bundle | `node scripts/suliko-doctor.mjs --live --bundle NEWFILE.json`; exclusive 0600/wx; synthetic canary must never appear |
| 5. გააუქმე მხოლოდ საკუთრებაში არსებული ინსტალაცია | Uninstall only managed setup | `--uninstall` / `-Uninstall`; preserve existing BB and user data SHA-256 |

Monotonic checkpoints: **setup → Hello → doctor → bundle → uninstall**, native Windows/macOS/Linux. p50/p90 from exactly three synthetic OS timings are **descriptive only**, not actual participants, consent, first-task success, or representative performance. Missing/cancelled OS fails the gate; total over 15 minutes is disclosed, not fabricated green. Windows NotSigned and SmartScreen must not be bypassed. This file creates no new form or public invitation.
