---
aliases: [stripe-best-practices, boas-praticas-stripe, stripe-melhores-praticas, stripe-patterns, padroes-stripe]
type: skill
source: plugin:stripe:stripe-best-practices
invocation: /stripe-best-practices
category: implementation
inputs: [Stripe integration code, payment flow description, Stripe API usage context]
outputs: [best practice recommendations, Stripe integration patterns, security guidelines, optimized payment flow]
estimated_tokens: 5000
---

# Stripe Best Practices

## Conceitos
- [[security]] — ensures secure handling of payment data and Stripe API keys
- [[architecture]] — patterns for robust Stripe payment flow integration
- [[quality]] — best practices for reliable payment processing

## Workflow
1. Analyze current Stripe integration code and payment flow
2. Compare against Stripe best practices for security, error handling, and idempotency
3. Provide recommendations for improved Stripe integration patterns

## Conecta com
- [[api-designer]] recebe: Stripe webhook and API contract patterns
- [[security-auditor]] recebe: payment security findings for audit
- [[architecture-designer]] recebe: payment architecture recommendations

## Quando usar
- When implementing or reviewing Stripe payment integrations
- When setting up Stripe webhooks, subscriptions, or checkout flows
- When ensuring payment processing follows Stripe security best practices
