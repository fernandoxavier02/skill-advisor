---
aliases: [setup-deploy, deploy-config, deployment-setup, configurar-deploy]
type: skill
source: setup-deploy
invocation: /setup-deploy
category: deployment
inputs: [deployment platform, environment variables]
outputs: [deployment configuration]
estimated_tokens: small
---

# Setup Deploy

## Conceitos
- [[deploy-platform-detection]] — auto-detect Fly.io, Render, Vercel, Netlify, Heroku
- [[environment-configuration]] — setting deployment environment
- [[deployment-secrets]] — API keys and credentials
- [[release-process]] — automated deployment workflow

## Workflow
1. Detect your deployment platform
2. Configure environment variables
3. Set deployment secrets (API keys, etc.)
4. Validate deployment configuration
5. Ready for /land-and-deploy workflow

## Conecta com
- [[land-and-deploy]] uses: deployment configuration
- [[ship]] precedes: deployment setup
- [[health]] validates: post-deploy monitoring

## Quando usar
- First time setting up deployments
- Changing deployment platforms
- Environment variable updates
- Before first deploy with /land-and-deploy
- Setting up CI/CD pipeline
