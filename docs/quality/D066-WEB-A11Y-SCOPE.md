# D-066 Web-only installed Hello accessibility smoke

Source: [Claude E9 #36](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/36), [E9 #53](https://gitlab.com/dol-1-group/suliko-ide/-/work_items/53), official [axe-core Playwright 4.14.0](https://www.npmjs.com/package/%40axe-core/playwright).

This is a **bounded first E9 step**, not WCAG certification. The job builds exact unmodified BB 0.49.0, installs the own Hello panel in a disposable loopback Web server, creates a synthetic Git project, skips optional provider setup without credentials, and uses Playwright + an exact-version `@axe-core/playwright@4.14.0` **CI-only** library to check the actual rendered panel in English and Georgian. The new dependency is **MPL-2.0** and remains outside shipped Suliko plugin production packages; no runtime dependency, copies or license changes are introduced. There is no user data or real hosted endpoint.

It fails for any `impact=critical` axe WCAG2A/2AA/2.1A/2.1AA/2.2AA violation on the rendered section or detected horizontal text overflow. Serious/minor/incomplete counts are reported separately, **not** assumed to pass. No raw DOM, findings node HTML, screenshot, screenshot of users or credentials are uploaded.

**Limits:** Color contrast and some keyboard behaviors require manual/cross-browser testing; 0 automated critical violations does not imply zero issues, accessibility or localization completeness. Desktop E2E, Remote mock panel, visual screenshot baselines, 30-minute soak and actual QA parity are not exercised by this narrow workflow and remain separate E9 acceptance gates.
