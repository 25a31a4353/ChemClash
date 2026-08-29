"""
ChemClash — Challenge Bank
Pre-built puzzle payloads. The frontend pre-fetches these so round
transitions are instantaneous (zero LLM call on load).
"""

from __future__ import annotations
from typing import TypedDict

class Challenge(TypedDict):
    id: int
    nucleophile: str
    electrophile: str
    shouldReact: bool
    hint: str
    mechanism: str
    explanation: str
    difficulty: str   # "easy" | "medium" | "hard"


CHALLENGES: list[Challenge] = [
    {
        "id": 1,
        "nucleophile": "OH⁻",
        "electrophile": "CH₃Br",
        "shouldReact": True,
        "hint": "Hydroxide attacks the carbon bearing the leaving group (SN2).",
        "mechanism": "SN2",
        "explanation": "Strong hydroxide nucleophile attacks the primary carbon of CH₃Br via backside attack. Br⁻ departs as the C–O bond forms simultaneously.",
        "difficulty": "easy",
    },
    {
        "id": 2,
        "nucleophile": "H₂O",
        "electrophile": "CH₄",
        "shouldReact": False,
        "hint": "Methane has no electrophilic carbon — no leaving group, no reaction.",
        "mechanism": "",
        "explanation": "CH₄ has no leaving group and no electrophilic carbon. Water is a weak nucleophile. No driving force for any substitution or elimination.",
        "difficulty": "easy",
    },
    {
        "id": 3,
        "nucleophile": "NH₃",
        "electrophile": "CH₃Cl",
        "shouldReact": True,
        "hint": "Ammonia acts as a nucleophile toward the electrophilic carbon (SN2).",
        "mechanism": "SN2",
        "explanation": "Ammonia's lone pair attacks the electrophilic carbon of CH₃Cl, displacing Cl⁻ in an SN2 step to form methylammonium chloride.",
        "difficulty": "easy",
    },
    {
        "id": 4,
        "nucleophile": "Cl⁻",
        "electrophile": "Benzene",
        "shouldReact": False,
        "hint": "Cl⁻ alone cannot react with benzene — a Lewis acid catalyst is required.",
        "mechanism": "",
        "explanation": "Benzene undergoes electrophilic aromatic substitution, not nucleophilic attack. Cl⁻ is a nucleophile; it cannot directly attack the electron-rich aromatic ring.",
        "difficulty": "medium",
    },
    {
        "id": 5,
        "nucleophile": "CN⁻",
        "electrophile": "(CH₃)₃C⁺",
        "shouldReact": True,
        "hint": "Cyanide attacks the carbocation readily (SN1 scenario).",
        "mechanism": "SN1",
        "explanation": "The stable tertiary carbocation is attacked by CN⁻ in the rate-determining product-forming step of an SN1 mechanism. No inversion — both faces are accessible.",
        "difficulty": "medium",
    },
    {
        "id": 6,
        "nucleophile": "Br⁻",
        "electrophile": "CH₃CH₂Cl",
        "shouldReact": True,
        "hint": "Iodide and bromide are excellent SN2 nucleophiles — polarisable and not too bulky.",
        "mechanism": "SN2",
        "explanation": "Br⁻ is a strong, polarisable nucleophile. It attacks the primary carbon of ethyl chloride via backside attack, displacing Cl⁻ in a classic SN2 reaction.",
        "difficulty": "easy",
    },
    {
        "id": 7,
        "nucleophile": "OH⁻",
        "electrophile": "(CH₃)₂CHBr",
        "shouldReact": True,
        "hint": "Secondary substrates — will SN2 or E2 dominate?",
        "mechanism": "SN2/E2",
        "explanation": "With a strong base/nucleophile like OH⁻ and a secondary substrate, both SN2 and E2 compete. Heating and more hindered base favours E2 (Zaitsev alkene); low temperature and polar aprotic solvent favours SN2.",
        "difficulty": "hard",
    },
    {
        "id": 8,
        "nucleophile": "H₂O",
        "electrophile": "CH₃CH₂Br",
        "shouldReact": True,
        "hint": "Water is a weak nucleophile — reaction is slow but possible under forcing conditions.",
        "mechanism": "SN2",
        "explanation": "Water can act as a weak nucleophile toward primary alkyl halides, giving an alcohol after deprotonation. The reaction is slow due to water's low nucleophilicity.",
        "difficulty": "medium",
    },
]


def get_challenge(challenge_id: int) -> Challenge | None:
    return next((c for c in CHALLENGES if c["id"] == challenge_id), None)


def get_batch(start_id: int, count: int = 3) -> list[Challenge]:
    """Return `count` challenges starting from `start_id` (wraps around)."""
    ids = [(start_id + i - 1) % len(CHALLENGES) for i in range(count)]
    return [CHALLENGES[i] for i in ids]
