---
aliases: [firebase, firebase-mcp, servidor-firebase, firebase-server, firebase-tools]
type: skill
source: mcp:firebase
invocation: /firebase
category: deployment
inputs: [Firebase project ID, Firebase CLI commands, Firestore queries, Cloud Functions configuration]
outputs: [Firebase operation results, Firestore data, deployment status, Cloud Functions logs]
estimated_tokens: 5000
---

# Firebase MCP

## Conceitos
- [[deployment]] — manages Firebase project resources and deployments
- [[architecture]] — interacts with Firestore, Cloud Functions, and Firebase services
- [[security]] — manages Firebase security rules and authentication configuration
- [[observability]] — accesses Cloud Functions logs and monitoring data

## Workflow
1. Connect to the Firebase project via MCP server interface
2. Execute Firebase operations (Firestore queries, deployments, function management)
3. Return operation results, logs, or configuration data

## Conecta com
- [[deploy]] recebe: Firebase deployment capabilities for hosting and functions
- [[database-optimizer]] recebe: Firestore query patterns for optimization
- [[monitoring-expert]] recebe: Cloud Functions logs and performance data

## Quando usar
- When managing Firebase project resources (Firestore, Functions, Hosting)
- When querying or modifying Firestore data during development
- When deploying or debugging Cloud Functions
- When checking Firebase project configuration and security rules
