# Short research note: model choice for a fast destination debate

## Goal

The aim was to select three models for a destination debate system that are:

- **fast enough** for near real-time back-and-forth replies,
- **cheap enough** to run in a multi-agent setup,
- **close enough in capability** to keep the debate fair,
- and **not concentrated in one geographic region**.

Because of these requirements, the selection could not be based on price alone. The models also needed to be practical for short argumentative responses, ranking tasks, and structured comparison.

## Final selection

The recommended trio on OpenRouter is:

- `google/gemini-2.5-flash-lite`
- `mistralai/mistral-small-3.2-24b-instruct`
- `qwen/qwen-plus`

## Why these three models were chosen

### 1. They are fast enough for debate

A debate system feels good only when the responses arrive quickly. If one or more agents are too slow, the interaction starts to feel delayed instead of dynamic.

This is why the chosen models come from the **fast, efficient model tier** rather than the heavy flagship tier.  
Among them:

- **Gemini 2.5 Flash-Lite** is positioned as an ultra-low-latency, cost-efficient model.
- **Mistral Small 3.2 24B Instruct** is designed for low-latency performance across common AI tasks.
- **Qwen-Plus** is presented as a model that balances performance, speed, and cost.

Together, they are a better fit for rapid debate than slower reasoning-heavy models.

### 2. They are still affordable in a 3-agent setup

The system needs three models answering in sequence, which multiplies total usage cost. Because of that, very expensive models are not practical unless the debate is used rarely.

This trio stays in the relatively affordable range while still offering enough capability for structured comparison. That makes it suitable for repeated debate rounds, ranking experiments, or testing multiple destinations without the cost growing too quickly.

### 3. They are closer in strength than ultra-budget alternatives

The cheapest available models are not always the best choice. In a debate, the models should be **reasonably similar in practical quality**, so that one model does not dominate purely because it is much stronger than the others.

This trio works well because all three models sit in the **small-but-capable** class rather than mixing one mid-tier model with two clearly weaker budget models. That improves fairness and makes the comparison between agents more meaningful.

### 4. They come from different vendor ecosystems

Another important reason for this choice is geographic and vendor diversity.

- **Gemini** represents the Google ecosystem.
- **Mistral** represents a European vendor.
- **Qwen** adds an Asian vendor ecosystem.

This does not automatically guarantee neutrality, but it reduces the chance that all three agents will reflect the same regional assumptions, priorities, or travel preferences. For destination debates, that matters, because recommendations can easily become biased toward culturally familiar places or regions that are overrepresented in one ecosystem.

## Why not just choose the cheapest models

Choosing the absolute cheapest models would lower costs, but it would also make the debate less reliable.

A weak model may answer quickly, but it can struggle with:
- tradeoff reasoning,
- structured ranking,
- consistent scoring,
- or balanced argumentation.

Since the task is not simple text generation but comparing destinations across factors like cost, safety, transport, infrastructure, and general livability, the models need more than speed. They also need enough quality to argue and compare in a stable way.

That is why this selection focuses on **cheap but still capable** models, not the lowest-cost tier possible.

## Why OpenRouter is the right platform for this

OpenRouter makes this setup easier for two reasons.

First, it provides **one API** for all three models, which simplifies implementation.  
Second, it is designed around provider routing and performance-aware usage, which helps reduce operational complexity and makes it easier to maintain a fast debate pipeline.

Instead of building three separate vendor integrations, the system can use one interface and still access region-diverse models from different providers.

## Conclusion

The chosen trio — **Gemini 2.5 Flash-Lite**, **Mistral Small 3.2 24B Instruct**, and **Qwen-Plus** — is the strongest practical option on OpenRouter for a destination debate that must be:

- fast,
- relatively cheap,
- reasonably balanced in strength,
- and not overly concentrated in one region or vendor ecosystem.

The three models are not identical, but they are close enough in practical capability to support a fair debate while keeping latency and cost under control.

## Sources

- OpenRouter — Gemini 2.5 Flash-Lite: https://openrouter.ai/google/gemini-2.5-flash-lite
- OpenRouter — Mistral Small 3.2 24B Instruct: https://openrouter.ai/mistralai/mistral-small-3.2-24b-instruct
- OpenRouter — Qwen-Plus: https://openrouter.ai/qwen/qwen-plus
- OpenRouter — Latency and Performance docs: https://openrouter.ai/docs/guides/best-practices/latency-and-performance
