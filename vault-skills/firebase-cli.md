---
aliases: [firebase-cli, firebase-mcp, firebase, cli-firebase, firebase-tools, firebase-deploy]
type: skill
source: mcp:firebase-cli
invocation: /firebase-cli
category: deployment
inputs: ["Firebase project ID", "deployment target (hosting, functions, rules)", "Firebase configuration files"]
outputs: ["deployment results", "Firebase resource management", "project configuration queries"]
estimated_tokens: 5000
---

# Firebase CLI

## Conceitos
- [[deployment]] — manages Firebase deployments for hosting, functions, and rules
- [[architecture]] — interacts with Firebase project resources and configuration
- [[observability]] — queries Firebase project state and deployment status

## Workflow
1. Connect to the Firebase project via MCP server
2. Execute Firebase CLI commands (deploy, serve, emulate, manage)
3. Handle deployment targets (hosting, functions, firestore rules, storage rules)
4. Report deployment results and any errors encountered

## Conecta com
- [[deploy]] recebe: Firebase deployment commands as part of broader deployment workflow
- [[cc-mcp]] recebe: Firebase MCP server configuration
- [[monitoring-expert]] recebe: deployment metrics and status for monitoring

## Quando usar
- When deploying Firebase hosting, Cloud Functions, or security rules
- When managing Firebase project resources from Claude Code
- When you need to interact with Firebase services programmatically via MCP
