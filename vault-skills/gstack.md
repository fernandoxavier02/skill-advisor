---
aliases: [gstack, headless-browser, browser-automation, navegador-sem-interface]
type: skill
source: gstack
invocation: /gstack
category: utility
inputs: [web application URL]
outputs: [browser session, page interactions]
estimated_tokens: medium
---

# gstack

## Conceitos
- [[headless-browser]] — automated browser without UI
- [[page-navigation]] — visiting URLs and navigating
- [[element-interaction]] — clicking, typing, form filling
- [[state-verification]] — checking page content and elements
- [[diff-analysis]] — before/after comparison
- [[qa-testing]] — systematic website testing

## Workflow
1. Navigate to web application
2. Interact with page elements
3. Verify state and content
4. Compare before/after states
5. Document findings
6. Iterate through test scenarios

## Conecta com
- [[qa]] uses: for QA testing
- [[setup-browser-cookies]] provides: authenticated sessions
- [[investigate]] uses: for debugging web issues

## Quando usar
- QA testing of web applications
- Site dogfooding and exploration
- Automated testing before deployment
- Debugging web UI issues
- Performance verification
- User workflow validation
