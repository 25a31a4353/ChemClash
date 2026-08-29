"""
ChemClash — LLM Client
Abstracts over two providers so the router doesn't care which one is active:
  • OpenAI SDK  (also works for any OpenAI-compatible endpoint)
  • IBM watsonx.ai  (via ibm-watsonx-ai SDK, which exposes a chat-completion
                     interface that mirrors the OpenAI messages format)
"""

from __future__ import annotations

import json
import logging
from typing import Any

from config import (
    LLM_PROVIDER,
    LLM_MAX_TOKENS,
    LLM_TEMPERATURE,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
    WATSONX_API_KEY,
    WATSONX_PROJECT_ID,
    WATSONX_URL,
    WATSONX_MODEL,
)

logger = logging.getLogger(__name__)

# ── System prompt (Socratic tutor) ────────────────────────────────────────────
# The LLM is instructed to reason about the chemistry move and reply ONLY with
# a JSON object so we can parse it deterministically.
SYSTEM_PROMPT = """
You are a Socratic organic-chemistry tutor embedded inside ChemClash, a
competitive chemistry game. A student is attempting a reaction mechanism step.
Your job is to evaluate their move and return ONLY a valid JSON object — no
markdown fences, no prose, no extra keys — in exactly this shape:

{
  "status": "pass" | "fail",
  "hint": "<one sentence of Socratic guidance>",
  "explanation": "<two or three sentences that explain the chemistry>"
}

Rules you must follow:
1. If the nucleophile targets a TERTIARY carbon, always return
   "status": "fail" and hint: "Watch out for steric hindrance!" along with a
   brief explanation of why SN2 fails at tertiary centres.
2. If the nucleophile targets a PRIMARY carbon and the nucleophile is strong
   (e.g. hydroxide, cyanide, halide), return "status": "pass".
3. If the nucleophile targets a SECONDARY carbon, hint at competing E2
   elimination and return "status": "pass" with a cautionary hint.
4. If the source is not a nucleophile, return "status": "fail" with an
   appropriate hint.
5. Keep hints short (<= 12 words), Socratic (pose a question or nudge), and
   encouraging.
6. Never reveal the answer outright — guide the student to reason it out.
7. Respond ONLY with the JSON object described above. Any text outside the
   JSON will break the game.
""".strip()


def _chat_openai(messages: list[dict[str, str]]) -> str:
    """Call the OpenAI (or OpenAI-compatible) chat-completion endpoint."""
    from openai import OpenAI  # lazy import — only required when provider=openai

    client_kwargs: dict[str, Any] = {"api_key": OPENAI_API_KEY}
    if OPENAI_BASE_URL:
        client_kwargs["base_url"] = OPENAI_BASE_URL

    client = OpenAI(**client_kwargs)

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,  # type: ignore[arg-type]
        max_tokens=LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
        response_format={"type": "json_object"},  # enforces JSON output
    )
    return response.choices[0].message.content or ""


def _chat_watsonx(messages: list[dict[str, str]]) -> str:
    """Call IBM watsonx.ai using its chat-completion interface.

    ibm-watsonx-ai >= 0.2 exposes ModelInference with a chat() method that
    accepts the same OpenAI-style messages list.
    """
    from ibm_watsonx_ai import Credentials  # type: ignore
    from ibm_watsonx_ai.foundation_models import ModelInference  # type: ignore

    credentials = Credentials(
        url=WATSONX_URL,
        api_key=WATSONX_API_KEY,
    )

    model = ModelInference(
        model_id=WATSONX_MODEL,
        credentials=credentials,
        project_id=WATSONX_PROJECT_ID,
        params={
            "max_new_tokens": LLM_MAX_TOKENS,
            "temperature": LLM_TEMPERATURE,
        },
    )

    # watsonx chat() mirrors the OpenAI messages structure
    response = model.chat(messages=messages)
    # response shape: {"choices": [{"message": {"content": "..."}}], ...}
    return response["choices"][0]["message"]["content"]


def evaluate_move(source: str, target: str) -> dict[str, str]:
    """
    Build the LLM prompt for a mechanism move and return the parsed verdict.

    Parameters
    ----------
    source : str
        The reactive species the student is moving electrons FROM
        (e.g. "nucleophile", "hydroxide").
    target : str
        The atom or group the student is moving electrons TOWARD
        (e.g. "tertiary_carbon", "primary_carbon", "bromine").

    Returns
    -------
    dict with keys: status, hint, explanation
    """
    user_message = (
        f'The student attempts the following mechanism step:\n'
        f'  source (electron donor) : "{source}"\n'
        f'  target (electron acceptor): "{target}"\n\n'
        f"Evaluate this move according to your rules and reply with ONLY "
        f"the JSON object described in the system prompt."
    )

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    logger.info("LLM provider=%s  source=%s  target=%s", LLM_PROVIDER, source, target)

    raw: str
    if LLM_PROVIDER == "watsonx":
        raw = _chat_watsonx(messages)
    else:
        raw = _chat_openai(messages)

    logger.debug("LLM raw response: %s", raw)

    try:
        result: dict[str, str] = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("LLM returned non-JSON: %s", raw)
        raise ValueError(f"LLM returned non-JSON output: {raw!r}") from exc

    return result
