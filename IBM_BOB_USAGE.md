# How I Used IBM Bob in ChemClash

This document describes, from my perspective as the developer, how I used **IBM Bob** — IBM's AI software engineering assistant — while building ChemClash, an AI-powered gamified organic chemistry platform.

---

## What is IBM Bob?

IBM Bob is an AI-powered coding assistant built into my development environment. It can read, write, and refactor code across the entire codebase, answer technical questions, help plan architecture, and run validation checks — all from within the editor. I used it as a hands-on pair programmer throughout the project.

---

## How I Used Bob in This Project

### 1. Designing the Dual-Provider LLM Architecture

One of the trickiest decisions early on was how to support both **OpenAI** and **IBM watsonx.ai** as interchangeable AI backends without tangling the logic throughout the codebase. I asked Bob to help me think through the abstraction. Together we landed on a single [`llm_client.py`](backend/llm_client.py) module that exposes one function — `evaluate_move()` — and routes internally based on an environment variable (`LLM_PROVIDER`). The two concrete implementations, [`_chat_openai()`](backend/llm_client.py:63) and [`_chat_watsonx()`](backend/llm_client.py:83), are kept private. The rest of the app never has to care which provider is active.

Bob wrote the initial skeleton of this file and helped me phrase the Socratic tutor system prompt so it would return strict JSON every time — no markdown fences, no prose leaking out.

### 2. Building the Rule-Based Fast Validator

I wanted mechanism evaluation to be near-instant for common moves — no LLM call, no API latency. Bob helped me design [`fast_validator.py`](backend/fast_validator.py), which encodes five organic chemistry rules (steric hindrance at tertiary carbons, SN2 at primary carbons, competing E2 at secondary centres, EAS on aromatics, and non-nucleophile rejection) as simple set lookups that return in under 1 ms.

Bob suggested the `Verdict` dataclass as a clean return type and pointed out that returning `None` (rather than a default verdict) was the right signal to the router that the LLM fallback should fire. That small design choice kept the fast path and the LLM path cleanly separated in [`mechanism.py`](backend/routers/mechanism.py).

### 3. Writing the Adaptive PYQ Router

The adaptive learning feature in [`adaptive.py`](backend/routers/adaptive.py) needed to pick the best past-year question (PYQ) for each student based on their personal weakness profile. I used Bob to help me design a **hallucination-proof** LLM integration: the model is only ever shown a pre-filtered candidate list from `pyq_db.json` and must return one of the provided `id` values — nothing else. If it invents an id, the system silently falls back to the deterministic rule-based picker.

Bob drafted the `_MATCHMAKER_SYSTEM` prompt with the strict constraint language, and helped me write the validation logic that checks the returned id against the `valid_ids` set before trusting it.

### 4. Generating and Syncing Chemistry Content

I had a `chem_master_data.json` file with 10 high-yield organic chemistry concepts and needed them reflected consistently in both `backend/concept_tree.json` and the frontend's `organic_db.json`. Bob wrote [`sync_concepts.py`](sync_concepts.py) — a standalone script that merges the master data into both files without duplicating entries, and maps concept metadata to the game's difficulty tiers automatically.

This saved me from manually keeping two JSON files in sync every time I updated the master data.

### 5. Configuring the Environment and `.env` Template

Bob generated [`backend/.env.example`](backend/.env.example) with clearly commented sections for the OpenAI block, the watsonx block, and the shared LLM knobs (`LLM_MAX_TOKENS`, `LLM_TEMPERATURE`). It also wired up [`config.py`](backend/config.py) to read all of these via `python-dotenv`, with sensible defaults so the app degrades gracefully when no API key is provided.

### 6. Code Reviews and Refinements

Throughout development I used Bob for targeted code reviews. A few things it caught or improved:

- In the mechanism router, it flagged that importing `evaluate_move` inside the `if` block (lazy import) was the right move to avoid a circular dependency at startup.
- It suggested adding the `X-Accel-Buffering: no` header to the SSE streaming endpoint so the hint tokens wouldn't be buffered by reverse proxies like Nginx.
- It recommended capping the adaptive LLM candidate list at 8 items to stay within the model's context budget while still giving it meaningful signal.

### 7. Writing Documentation

This document itself was produced with Bob's help. I described what I had built and how I had used the tool, and Bob turned that into the structured Markdown you're reading now — with accurate file references, proper linking to the relevant source files, and a clear narrative that reflects my actual development experience.

---

## IBM watsonx.ai Integration

Beyond using Bob as a coding assistant, ChemClash also integrates **IBM watsonx.ai** as a first-class LLM provider at runtime. When `LLM_PROVIDER=watsonx` is set in `.env`, the app uses the `ibm-watsonx-ai` SDK and the `ibm/granite-13b-chat-v2` model to power:

- The **Socratic tutor** — evaluates student mechanism moves and returns guided hints.
- The **adaptive PYQ matchmaker** — selects the best-matched exam question for each student's weakness profile.

The watsonx path uses the same `ModelInference.chat()` interface that mirrors the OpenAI messages format, so no changes are needed anywhere else in the stack when switching providers.

---

## Summary

| Task | How Bob helped |
|---|---|
| Dual-provider LLM abstraction | Designed the module structure and wrote the provider-switching logic |
| Socratic tutor system prompt | Crafted strict JSON-only prompt to prevent output parsing failures |
| Rule-based fast validator | Designed the `Verdict` dataclass and five chemistry rules |
| Hallucination-proof adaptive LLM | Wrote the constraint prompt and id-validation fallback logic |
| Content sync script | Wrote `sync_concepts.py` to keep two JSON files consistent |
| Environment configuration | Generated `.env.example` and wired up `config.py` |
| Code review | Caught lazy-import issues, SSE headers, and token budget concerns |
| Documentation | Helped author this document |

Bob was a consistent collaborator across every layer of this project — from architecture decisions down to individual prompt wording.
