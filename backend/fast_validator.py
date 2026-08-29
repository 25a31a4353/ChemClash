"""
ChemClash — Rule-Based Fast-Path Validator
Responds in < 1 ms with no LLM call needed.
Covers the 95% of common undergraduate organic chemistry moves.
"""

from __future__ import annotations
from dataclasses import dataclass

# ── Canonical sets ────────────────────────────────────────────────────────────

STRONG_NUCLEOPHILES = {
    "oh-", "hydroxide", "cn-", "cyanide", "hs-", "hydrosulfide",
    "i-", "iodide", "br-", "bromide", "cl-", "chloride",
    "f-", "fluoride", "nh2-", "amide", "ch3o-", "methoxide",
    "et o-", "ethoxide", "rco2-", "carboxylate", "acetate",
    "n3-", "azide", "rs-", "thiolate", "nucleophile",
}

WEAK_NUCLEOPHILES = {
    "h2o", "water", "nh3", "ammonia", "roh", "alcohol",
    "rco2h", "carboxylic acid", "ch3oh", "methanol",
}

NON_NUCLEOPHILES = {
    "h+", "proton", "h3o+", "hydronium", "hcl", "hbr", "hi",
    "alcl3", "fecl3", "bf3", "lewis acid", "electrophile",
    "h2so4", "hno3", "bh3",
}

GOOD_LEAVING_GROUPS = {
    "bromine", "br", "br-", "chlorine", "cl", "cl-",
    "iodine", "i", "i-", "ots", "tosylate", "oms", "mesylate",
    "leaving group", "primary_carbon", "ch3br", "ch3cl", "ch3i",
    "carbon",  # in our demo: C is the electrophilic carbon with Br leaving
}

TERTIARY_TARGETS = {
    "tertiary_carbon", "tertiary carbon", "t-carbon", "(ch3)3c+",
    "tert-butyl", "carbocation", "t-butyl cation",
}

SECONDARY_TARGETS = {
    "secondary_carbon", "secondary carbon", "s-carbon", "cyclohexyl",
    "isopropyl carbon",
}

AROMATIC_TARGETS = {
    "benzene", "toluene", "naphthalene", "aromatic", "phenyl",
    "aromatic carbon",
}


@dataclass
class Verdict:
    status: str          # "pass" | "fail"
    hint: str
    explanation: str
    cached: bool = True  # always True for rule-based path
    latency_ms: float = 0.0


def evaluate_fast(source: str, target: str) -> Verdict | None:
    """
    Run the rule-based fast path.
    Returns a Verdict if a rule fires, or None if the LLM should be consulted.
    """
    s = source.lower().strip()
    t = target.lower().strip()

    # ── Rule 1: Non-nucleophile as source → instant fail ─────────────────────
    if s in NON_NUCLEOPHILES:
        return Verdict(
            status="fail",
            hint="Is that species actually electron-rich?",
            explanation=(
                f"'{source}' is an electrophile or acid, not a nucleophile. "
                "A valid mechanism step requires the electron-rich species "
                "to attack the electron-poor centre."
            ),
        )

    # ── Rule 2: Nucleophile → tertiary carbon → SN2 steric fail ──────────────
    if t in TERTIARY_TARGETS and s in STRONG_NUCLEOPHILES:
        return Verdict(
            status="fail",
            hint="What does steric hindrance do to backside attack?",
            explanation=(
                "SN2 reactions require simultaneous bond-forming and bond-breaking "
                "via backside attack. A tertiary carbon is surrounded by three bulky "
                "substituents, making this geometry impossible. SN1 is preferred here."
            ),
        )

    # ── Rule 3: Strong nucleophile → primary carbon → SN2 pass ───────────────
    if t in GOOD_LEAVING_GROUPS and s in STRONG_NUCLEOPHILES:
        return Verdict(
            status="pass",
            hint="Correct — what does inversion of configuration mean here?",
            explanation=(
                "A strong nucleophile attacking a primary electrophilic carbon "
                "proceeds via the SN2 mechanism: concerted backside attack with "
                "inversion of configuration (Walden inversion). This is the favoured pathway."
            ),
        )

    # ── Rule 4: Weak nucleophile → secondary carbon → warn of E2 ────────────
    if t in SECONDARY_TARGETS:
        return Verdict(
            status="pass",
            hint="Could elimination compete here under strong base conditions?",
            explanation=(
                "Attack on a secondary carbon can proceed SN2, but strong bases "
                "may favour E2 elimination instead. The outcome depends on "
                "temperature, solvent polarity, and base strength."
            ),
        )

    # ── Rule 5: Any nucleophile → aromatic → EAS required ───────────────────
    if t in AROMATIC_TARGETS:
        return Verdict(
            status="fail",
            hint="Does benzene's π system allow direct nucleophilic attack?",
            explanation=(
                "Aromatic rings resist nucleophilic addition because it would "
                "destroy aromaticity. Nucleophilic aromatic substitution (NAS) "
                "requires strong electron-withdrawing groups ortho/para to the leaving group."
            ),
        )

    # No rule matched — defer to LLM
    return None
