---
aliases: [land-and-deploy, deployment, deploy-workflow, land-workflow, implantacao]
type: skill
source: land-and-deploy
invocation: /land-and-deploy
category: deployment
inputs: [PR ID, deployment config]
outputs: [merged PR, deployed code, health verification]
estimated_tokens: large
---

# Land and Deploy

## Conceitos
- [[ci-cd-pipeline]] — automated testing and deployment
- [[canary-deployment]] — gradual rollout verification
- [[production-health]] — monitoring post-deploy
- [[merge-automation]] — safe PR merging

## Workflow
1. Merge PR to base branch
2. Wait for CI pipeline to complete
3. Deploy to production
4. Run canary checks on production
5. Verify application health

## Conecta com
- [[ship]] produces: PR ready to land
- [[setup-deploy]] configures: deployment settings
- [[health]] validates: production health

## Quando usar
- Ready to ship a feature to production
- Merging and deploying completed work
- After PR review approval
- When deploying hotfixes
