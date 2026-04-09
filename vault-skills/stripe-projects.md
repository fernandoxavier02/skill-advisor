---
aliases: [stripe-projects, projetos-stripe, stripe, stripe-integration, stripe-setup]
type: skill
source: plugin:stripe:stripe-projects
invocation: /stripe-projects
category: implementation
inputs: [Stripe project configuration, API keys, integration requirements]
outputs: [Stripe project setup, integration configuration, project management interface]
estimated_tokens: 2000
---

# Stripe Projects

## Conceitos
- [[architecture]] — manages Stripe project configurations and integrations
- [[deployment]] — handles Stripe environment setup (test/live modes)
- [[security]] — manages API keys and webhook configurations securely

## Workflow
1. List or select Stripe projects available in the current context
2. Configure project settings, API keys, and webhook endpoints
3. Validate integration setup and provide project management interface

## Conecta com
- [[api-designer]] recebe: Stripe API contract definitions for integration
- [[deploy]] recebe: Stripe configuration for deployment environments

## Quando usar
- When managing Stripe project configurations
- When setting up or switching between Stripe test and live environments
- When configuring Stripe integrations in a project
