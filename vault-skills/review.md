---
aliases: [review, pr-review, code-review, revisao-pr]
type: skill
source: review
invocation: /review
category: quality
inputs: [PR diff, base branch code]
outputs: [review findings, safety checks, recommendations]
estimated_tokens: large
---

# Review

## Conceitos
- [[sql-safety]] — database query security
- [[llm-trust-boundaries]] — AI prompt injection prevention
- [[conditional-logic]] — edge case handling
- [[security-review]] — vulnerability assessment
- [[performance-impact]] — efficiency evaluation

## Workflow
1. Analyze PR diff against base branch
2. Check for SQL injection vulnerabilities
3. Validate LLM trust boundary integrity
4. Review conditional logic for edge cases
5. Assess security implications
6. Verify performance impact
7. Provide recommendations

## Conecta com
- [[ship]] produces: PR ready for review
- [[land-and-deploy]] uses: post-review
- [[investigate]] helps: understand complex diffs

## Quando usar
- Before landing (merging) a PR
- Security-critical code reviews
- LLM integration validation
- Database query review
- Performance-sensitive changes
- Before production deployment
