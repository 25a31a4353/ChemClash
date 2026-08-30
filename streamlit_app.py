"""
ChemClash — Streamlit Frontend
================================
Deployment:  Streamlit Community Cloud
Main file:   streamlit_app.py   ← set this in the Streamlit Cloud dashboard

Environment variables (set in Streamlit Cloud > App Settings > Secrets):
    BACKEND_URL = https://your-render-service.onrender.com

Local development fallback: http://localhost:8000
"""

import os
import datetime
import requests
import streamlit as st

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG — reads from environment; falls back to localhost for local dev
# ─────────────────────────────────────────────────────────────────────────────

BACKEND_URL: str = os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")

# ─────────────────────────────────────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="ChemClash — Organic Chemistry Arena",
    page_icon="⚗️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────────────────────
# STATIC CONCEPT DATA  (used by the cheat sheet — no API key required)
# ─────────────────────────────────────────────────────────────────────────────

CHEAT_SHEET_DATA = {
    "concepts": [
        {
            "name": "SN2 — Bimolecular Nucleophilic Substitution",
            "key_rule": "One concerted step: nucleophile attacks the back of the electrophilic carbon as the leaving group departs.",
            "conditions": "Strong nucleophile + primary (or methyl) substrate + polar aprotic solvent.",
            "stereochemistry": "Walden inversion — configuration is inverted at the reaction centre.",
            "rate_law": "rate = k[Nu][substrate]   (second-order overall)",
            "example": "OH⁻ + CH₃Br → CH₃OH + Br⁻",
        },
        {
            "name": "SN1 — Unimolecular Nucleophilic Substitution",
            "key_rule": "Two-step: slow ionisation forms a carbocation, then fast nucleophile attack.",
            "conditions": "Weak/neutral nucleophile + tertiary (or secondary) substrate + polar protic solvent.",
            "stereochemistry": "Racemisation — both faces of the planar carbocation are attacked.",
            "rate_law": "rate = k[substrate]   (first-order — Nu concentration has no effect)",
            "example": "(CH₃)₃CBr → (CH₃)₃C⁺ + Br⁻  →  (CH₃)₃COH",
        },
        {
            "name": "E2 — Bimolecular Elimination",
            "key_rule": "Concerted: strong base abstracts β-H while the leaving group departs; anti-periplanar geometry required.",
            "conditions": "Strong, bulky base + secondary or tertiary substrate + high temperature.",
            "stereochemistry": "Anti addition — H and LG must be anti-periplanar (180°).",
            "rate_law": "rate = k[base][substrate]   (second-order)",
            "example": "KOH/EtOH + (CH₃)₂CHBr → (CH₃)₂C=CH₂ + KBr + H₂O",
        },
        {
            "name": "E1 — Unimolecular Elimination",
            "key_rule": "Two-step: ionisation to carbocation, then loss of β-H to form alkene.",
            "conditions": "Weak base, tertiary substrate, polar protic solvent, high temperature.",
            "stereochemistry": "Zaitsev product (most substituted alkene) predominates.",
            "rate_law": "rate = k[substrate]   (first-order)",
            "example": "(CH₃)₃CBr + H₂O/heat → (CH₃)₂C=CH₂ + HBr",
        },
        {
            "name": "EAS — Electrophilic Aromatic Substitution",
            "key_rule": "Aromatic ring attacks electrophile (E⁺); arenium ion intermediate loses H⁺ to restore aromaticity.",
            "conditions": "Lewis acid catalyst (AlCl₃, FeBr₃) to generate the electrophile.",
            "stereochemistry": "Retention of aromaticity; substituent directs ortho/para (ED) or meta (EW).",
            "rate_law": "rate depends on ring activation (ED groups accelerate, EW groups decelerate)",
            "example": "Benzene + Br₂/FeBr₃ → Bromobenzene + HBr",
        },
    ],
    "nucleophile_strength": {
        "Strong (SN2-prone)":  ["OH⁻", "CN⁻", "RS⁻", "I⁻", "Br⁻", "NH₂⁻", "CH₃O⁻", "N₃⁻"],
        "Weak (SN1-prone)":    ["H₂O", "ROH", "NH₃"],
        "Not nucleophiles":    ["H⁺", "AlCl₃", "BF₃", "H₂SO₄", "Lewis acids"],
    },
    "leaving_group_ability": [
        "Best:   TsO⁻ (tosylate) > I⁻ > Br⁻ > Cl⁻",
        "Weak:   F⁻, OH⁻, NH₂⁻, OR⁻  (poor leaving groups without activation)",
        "Rule:   Stability of the leaving group anion ≈ leaving ability",
    ],
    "carbocation_stability": [
        "Tertiary > Secondary > Primary > Methyl",
        "Resonance-stabilised (allylic/benzylic) > tertiary",
        "More substituted = more hyperconjugation = more stable",
    ],
    "solvent_guide": {
        "Polar aprotic (favours SN2)": ["DMF", "DMSO", "acetone", "acetonitrile"],
        "Polar protic (favours SN1/E1)": ["water", "methanol", "ethanol", "acetic acid"],
    },
    "pyq_highlights": [
        {"year": "JEE 2023", "topic": "SN2 vs SN1", "key_point": "Secondary alkyl halide + KCN → SN2 in DMSO; SN1 in EtOH."},
        {"year": "JEE 2022", "topic": "E2 stereochemistry", "key_point": "Anti-periplanar H–C–C–LG required; cis isomer reacts faster in some cyclic systems."},
        {"year": "JEE 2021", "topic": "Nucleophilicity vs basicity", "key_point": "In polar protic solvents, nucleophilicity order reverses relative to basicity for halides."},
        {"year": "JEE 2020", "topic": "Markovnikov's rule", "key_point": "H adds to the less-substituted carbon; carbocation intermediate stabilised by more substituents."},
        {"year": "JEE 2019", "topic": "Benzene diazonium", "key_point": "Diazonium salts are excellent electrophiles for EAS; replaced by N₂ gas in Sandmeyer reactions."},
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# CHEAT SHEET GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def generate_cheat_sheet(concept_data: dict) -> str:
    """
    Format concept_data into a well-structured Markdown string.
    Returned string is suitable for direct download as ChemClash_Study_Guide.md.
    """
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        "# ⚗️ ChemClash — Organic Chemistry Study Guide",
        "",
        f"> Auto-generated on {ts}  |  ChemClash AI Chemistry Platform",
        "",
        "---",
        "",
    ]

    # ── Core Reaction Mechanisms ──────────────────────────────────────────────
    lines += [
        "## 1. Core Reaction Mechanisms",
        "",
    ]
    for c in concept_data.get("concepts", []):
        lines += [
            f"### {c['name']}",
            "",
            f"**Key Rule:** {c['key_rule']}",
            "",
            f"| Property | Detail |",
            f"|---|---|",
            f"| Conditions | {c['conditions']} |",
            f"| Stereochemistry | {c['stereochemistry']} |",
            f"| Rate Law | `{c['rate_law']}` |",
            f"| Example | `{c['example']}` |",
            "",
        ]

    # ── Nucleophile Strength ──────────────────────────────────────────────────
    lines += [
        "---",
        "",
        "## 2. Nucleophile Strength Reference",
        "",
        "| Category | Species |",
        "|---|---|",
    ]
    for category, species in concept_data.get("nucleophile_strength", {}).items():
        lines.append(f"| **{category}** | {', '.join(species)} |")
    lines.append("")

    # ── Leaving Group Ability ─────────────────────────────────────────────────
    lines += [
        "---",
        "",
        "## 3. Leaving Group Ability",
        "",
    ]
    for item in concept_data.get("leaving_group_ability", []):
        lines.append(f"- {item}")
    lines.append("")

    # ── Carbocation Stability ─────────────────────────────────────────────────
    lines += [
        "---",
        "",
        "## 4. Carbocation Stability Order",
        "",
    ]
    for item in concept_data.get("carbocation_stability", []):
        lines.append(f"- {item}")
    lines.append("")

    # ── Solvent Guide ─────────────────────────────────────────────────────────
    lines += [
        "---",
        "",
        "## 5. Solvent Selection Guide",
        "",
        "| Solvent Type | Examples |",
        "|---|---|",
    ]
    for stype, examples in concept_data.get("solvent_guide", {}).items():
        lines.append(f"| **{stype}** | {', '.join(examples)} |")
    lines.append("")

    # ── PYQ Highlights ────────────────────────────────────────────────────────
    lines += [
        "---",
        "",
        "## 6. JEE PYQ Highlights",
        "",
        "| Year | Topic | Key Point |",
        "|---|---|---|",
    ]
    for pyq in concept_data.get("pyq_highlights", []):
        lines.append(f"| {pyq['year']} | {pyq['topic']} | {pyq['key_point']} |")
    lines.append("")

    # ── Footer ────────────────────────────────────────────────────────────────
    lines += [
        "---",
        "",
        "*Generated by ChemClash — AI-Powered Gamified Organic Chemistry*",
        "",
        "> Tip: Open this file in any Markdown viewer (VS Code, Obsidian, Typora) for best formatting.",
    ]

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# API HELPERS
# ─────────────────────────────────────────────────────────────────────────────

@st.cache_data(ttl=30)
def fetch_backend_status() -> dict:
    """GET / — returns backend health dict or an error dict."""
    try:
        r = requests.get(f"{BACKEND_URL}/", timeout=5)
        r.raise_for_status()
        return r.json()
    except requests.ConnectionError:
        return {"error": "connection_refused", "detail": f"Cannot reach {BACKEND_URL}"}
    except requests.Timeout:
        return {"error": "timeout", "detail": f"{BACKEND_URL} did not respond in 5 s"}
    except Exception as exc:
        return {"error": "unknown", "detail": str(exc)}


@st.cache_data(ttl=60)
def fetch_challenges() -> list:
    try:
        r = requests.get(f"{BACKEND_URL}/api/challenges/prefetch?start_id=1&count=8", timeout=5)
        r.raise_for_status()
        return r.json().get("challenges", [])
    except Exception:
        return []


def evaluate_mechanism(source: str, target: str) -> dict:
    try:
        r = requests.post(
            f"{BACKEND_URL}/api/evaluate-mechanism",
            json={"source": source, "target": target},
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except requests.ConnectionError:
        return {"error": True, "detail": f"Backend unreachable at {BACKEND_URL}"}
    except Exception as exc:
        return {"error": True, "detail": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR — always visible, never clutters the main game interface
# ─────────────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.title("⚗️ ChemClash")
    st.caption("AI-Powered Organic Chemistry")
    st.divider()

    # ── Navigation ────────────────────────────────────────────────────────────
    page = st.radio(
        "Navigate",
        ["🏠 Home", "⚗️ Mechanism Duels", "📚 Curriculum", "🏆 Leaderboard"],
        label_visibility="collapsed",
    )

    st.divider()

    # ── Backend status indicator ───────────────────────────────────────────────
    st.markdown("**Backend**")
    status = fetch_backend_status()
    if "error" in status:
        st.error(f"Offline — {status['detail']}", icon="🔴")
    else:
        st.success(
            f"Online • {status.get('pyq_count', '?')} PYQs • "
            f"{'AI ✓' if status.get('llm_enabled') else 'Rule-only'}",
            icon="🟢",
        )
        st.caption(f"`{BACKEND_URL}`")

    st.divider()

    # ── CHEAT SHEET DOWNLOAD ───────────────────────────────────────────────────
    st.markdown("**📥 Study Resources**")

    cheat_sheet_md = generate_cheat_sheet(CHEAT_SHEET_DATA)

    st.download_button(
        label="⬇️ Download Cheat Sheet",
        data=cheat_sheet_md,
        file_name="ChemClash_Study_Guide.md",
        mime="text/markdown",
        help="Download a Markdown study guide covering SN1, SN2, E1, E2, EAS, nucleophilicity, and JEE PYQ highlights.",
        use_container_width=True,
    )

    st.divider()
    st.caption(
        f"Backend URL: `{BACKEND_URL}`\n\n"
        "Set `BACKEND_URL` env var to override."
    )


# ─────────────────────────────────────────────────────────────────────────────
# MAIN AREA — routed by sidebar selection
# ─────────────────────────────────────────────────────────────────────────────

if page == "🏠 Home":
    st.title("⚗️ ChemClash — Organic Chemistry Arena")
    st.markdown(
        "**ChemClash** is a gamified AI platform that turns organic chemistry into an e-sport. "
        "Drag nucleophiles onto electrophilic carbons, defend your mechanism against a Socratic AI tutor, "
        "and climb the leaderboard."
    )

    col1, col2, col3 = st.columns(3)
    bk = fetch_backend_status()
    col1.metric("PYQs Available", bk.get("pyq_count", "—"))
    col2.metric("Curriculum Modules", bk.get("modules", "—"))
    col3.metric("Challenges", bk.get("challenges", "—"))

    st.info(
        "Use the **Mechanism Duels** page to practise SN1/SN2/E2 arrow-pushing. "
        "Download the **Cheat Sheet** from the sidebar anytime.",
        icon="💡",
    )

elif page == "⚗️ Mechanism Duels":
    st.title("⚗️ Mechanism Duels")
    st.markdown("Test a nucleophile → electrophile move and get instant Socratic feedback.")

    challenges = fetch_challenges()
    if not challenges:
        st.warning(
            f"Could not load challenges from `{BACKEND_URL}`. "
            "Is the backend running?",
            icon="⚠️",
        )
    else:
        ch_labels = {
            f"#{c['id']}  {c['nucleophile']} + {c['electrophile']}  [{c['difficulty']}]": c
            for c in challenges
        }
        selected_label = st.selectbox("Choose a challenge:", list(ch_labels.keys()))
        ch = ch_labels[selected_label]

        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown(f"**Nucleophile:** `{ch['nucleophile']}`")
            st.markdown(f"**Electrophile:** `{ch['electrophile']}`")
        with col_b:
            st.markdown(f"**Difficulty:** `{ch['difficulty']}`")
            st.markdown(f"**Expected Mechanism:** `{ch.get('mechanism', '?') or 'No reaction'}`")

        st.markdown("---")
        st.markdown("**Your Move**")
        source = st.text_input("Nucleophile (source):", value=ch["nucleophile"])
        target = st.text_input("Electrophile / target:", value=ch["electrophile"])

        if st.button("⚡ Evaluate Move", type="primary"):
            result = evaluate_mechanism(source, target)
            if result.get("error"):
                st.error(f"Backend error: {result['detail']}", icon="🔴")
            elif result.get("status") == "pass":
                st.success(f"✅ **Correct!**  {result['hint']}", icon="✅")
                with st.expander("Full explanation"):
                    st.write(result["explanation"])
                    st.caption(f"Latency: {result.get('latency_ms', 0):.1f} ms | Cached: {result.get('cached', False)}")
            else:
                st.error(f"❌ **Incorrect.**  {result['hint']}", icon="❌")
                with st.expander("Full explanation"):
                    st.write(result["explanation"])

        st.markdown("---")
        st.markdown(f"**Expected outcome:** {'✅ React' if ch.get('shouldReact') else '❌ No reaction'}")
        with st.expander("Show hint"):
            st.info(ch.get("hint", "No hint available."))

elif page == "📚 Curriculum":
    st.title("📚 Curriculum Tree")
    st.info("Curriculum modules are delivered via the Next.js frontend at `http://localhost:3000`.", icon="ℹ️")
    try:
        r = requests.get(f"{BACKEND_URL}/api/curriculum/summary", timeout=5)
        r.raise_for_status()
        data = r.json()
        col1, col2, col3 = st.columns(3)
        col1.metric("Total Modules", data.get("total_modules", "—"))
        col2.metric("Unique Tags", data.get("unique_tags", "—"))
        col3.metric("Total Slides", data.get("total_slides", "—"))
        st.markdown("**Modules by Difficulty**")
        st.bar_chart(data.get("by_difficulty", {}))
    except Exception as exc:
        st.error(f"Could not fetch curriculum: {exc}", icon="🔴")

elif page == "🏆 Leaderboard":
    st.title("🏆 Leaderboard")
    st.info("Live leaderboard coming soon. Submit your accuracy score to compete.", icon="🏆")
