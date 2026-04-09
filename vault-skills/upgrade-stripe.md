---
aliases: [upgrade-stripe, atualizar-stripe, stripe-upgrade, stripe-migration, migracao-stripe]
type: skill
source: plugin:stripe:upgrade-stripe
invocation: /upgrade-stripe
category: implementation
inputs: ["current Stripe API version", "target Stripe API version", "project codebase with Stripe integration"]
outputs: ["migration guide with breaking changes", "updated API calls and SDK usage", "deprecation warnings and replacements", "test recommendations for payment flows"]
estimated_tokens: 5000
---

# Upgrade Stripe

## Conceitos
- [[deployment]] — manages API version migration with minimal downtime risk
- [[security]] — ensures payment integrations remain PCI-compliant during upgrades
- [[testing]] — validates payment flows after SDK and API changes

## Workflow
1. Identify current Stripe API version and SDK version in the project
2. Analyze breaking changes and deprecations between current and target versions
3. Generate migration plan with specific code changes needed
4. Provide test checklist for critical payment flows (charges, subscriptions, webhooks)

## Conecta com
- [[tdd-write-tests]] recebe: payment flow test cases for pre-migration validation
- [[code-review-review-local-changes]] recebe: Stripe migration changes for review
- [[deploy]] recebe: deployment plan with rollback strategy for payment changes

## Quando usar
- When Stripe announces a new API version and you need to upgrade
- When your Stripe SDK is outdated and needs updating
- When you receive deprecation warnings from Stripe in your logs
