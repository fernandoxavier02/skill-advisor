---
aliases: [setup-browser-cookies, cookies, browser-setup, configurar-cookies]
type: skill
source: setup-browser-cookies
invocation: /setup-browser-cookies
category: utility
inputs: [Chromium browser with cookies]
outputs: [headless browser with imported cookies]
estimated_tokens: small
---

# Setup Browser Cookies

## Conceitos
- [[cookie-import]] — transferring browser state
- [[headless-browser]] — automated browsing environment
- [[authentication-state]] — maintaining logged-in sessions
- [[interactive-picker]] — user-friendly selection UI

## Workflow
1. Open interactive cookie picker UI
2. Select cookies from your real Chromium browser
3. Import selected cookies into headless session
4. Headless browser now has authenticated state
5. Use for QA testing with real session

## Conecta com
- [[gstack]] uses: for authenticated testing
- [[qa]] requires: login sessions
- [[setup-deploy]] configures: deployment cookies if needed

## Quando usar
- Need authenticated access in headless browser
- Testing features that require login
- QA with real user sessions
- Testing multi-user scenarios
- Before running QA on authenticated features
