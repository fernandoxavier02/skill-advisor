---
aliases: [huggingface-tool-builder, hf-tool-builder, construtor-ferramentas-huggingface, hf-api-builder, huggingface-scripts]
type: skill
source: "plugin:huggingface-skills:huggingface-tool-builder"
invocation: /huggingface-tool-builder
category: implementation
inputs: ["task description requiring Hugging Face API", "target model or dataset", "desired output format"]
outputs: ["working script or tool using Hugging Face API", "API integration code", "data pipeline"]
estimated_tokens: 5000
---

# HuggingFace Tool Builder

## Conceitos
- [[automation]] — builds tools and scripts that leverage the Hugging Face ecosystem
- [[data]] — integrates with Hugging Face datasets, models, and inference APIs
- [[architecture]] — designs API integrations and data pipelines around HF infrastructure

## Workflow
1. Analyze the task to determine which Hugging Face APIs, models, or datasets are needed
2. Build the tool or script with proper API authentication, error handling, and data flow
3. Test and validate the tool produces the expected output

## Conecta com
- [[huggingface-datasets]] recebe: dataset references for tool data sources
- [[huggingface-papers]] recebe: research context for model selection
- [[python-pro]] recebe: Python implementation patterns for HF API usage

## Quando usar
- When building tools or scripts that need Hugging Face API data
- When automating tasks involving HF models, datasets, or inference endpoints
- When creating data pipelines that pull from or push to Hugging Face Hub
