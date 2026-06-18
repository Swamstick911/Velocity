""""Turns a list of SignalResults into an overall risk score, tier, and gate.

Tier rules:
    - any HIGH-severity FAIL -> flagged(a definitive check tripped)
    - total score >= flagged threshold -> flagged
    - total score >= review threshold -> review
    - otherwise -> clean
Gate maps 1:1 from tier (clean-> none, review-> warn, flagged-> block)"""

from __future__ import annotations

from engine.types import (
    Status, Severity, Tier, Gate,
    TIER_REVIEW_MIN, TIER_FLAGGED_MIN,
)

_GATE_FOR_TIER = {
    Tier.CLEAN: Gate.NONE,
    Tier.REVIEW: Gate.WARN,
    Tier.FLAGGED: Gate.BLOCK,
}

def _has_hard_block(signals) -> bool:
    return any(s.status == Status.FAIL and s.severity == Severity.HIGH for s in signals)

def compute_tier(signals):
    total = sum(s.score for s in signals)
    if _has_hard_block(signals) or total >= TIER_FLAGGED_MIN:
        return Tier.FLAGGED, total
    if total >= TIER_REVIEW_MIN:
        return Tier.REVIEW, total
    return Tier.CLEAN, total

def by_vector(signals) -> dict:
    totals: dict[str, int] = {}
    for s in signals:
        totals[s.vector] = totals.get(s.vector, 0) + s.score
    return totals

def score_submission(signals) -> dict:
    tier, total = compute_tier(signals)
    return {
        "tier": tier,
        "score": total,
        "gate": _GATE_FOR_TIER[tier],
        "by-vector": by_vector(signals),
    }