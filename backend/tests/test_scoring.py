from engine.scoring import compute_tier, score_submission, by_vector
from engine.types import (
    SignalResult, Status, Severity, Tier, Gate,
    TIER_REVIEW_MIN, TIER_FLAGGED_MIN,
)


def _sig(score=0, vector="ai_slop", status=Status.PASS, severity=Severity.LOW):
    return SignalResult(id="x", vector=vector, status=status, severity=severity, score=score, detail="")


def test_clean_when_low_score():
    tier, _ = compute_tier([_sig(0), _sig(10)])
    assert tier == Tier.CLEAN


def test_review_tier_at_threshold():
    tier, _ = compute_tier([_sig(TIER_REVIEW_MIN)])
    assert tier == Tier.REVIEW


def test_flagged_by_score():
    tier, _ = compute_tier([_sig(TIER_FLAGGED_MIN)])
    assert tier == Tier.FLAGGED


def test_flagged_by_hard_block():
    # one high-severity FAIL flags regardless of total score
    tier, _ = compute_tier([_sig(score=0, status=Status.FAIL, severity=Severity.HIGH)])
    assert tier == Tier.FLAGGED


def test_gate_maps_from_tier():
    assert score_submission([_sig(TIER_FLAGGED_MIN)])["gate"] == Gate.BLOCK
    assert score_submission([_sig(0)])["gate"] == Gate.NONE


def test_by_vector_sums():
    totals = by_vector([
        _sig(10, vector="ai_slop"),
        _sig(25, vector="ai_slop"),
        _sig(50, vector="double_dip"),
    ])
    assert totals["ai_slop"] == 35
    assert totals["double_dip"] == 50
