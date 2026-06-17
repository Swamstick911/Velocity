""""README quality: exists, has enough substance, and includes a link
These are low-severity quality nudges, not fraud signals."""

from __future__ import annotations

import re

from engine.types import SignalResult, Vector, Status, Severity, SEVERITY_POINTS

README_MIN_WORDS = 50

def readme_quality(ctx) -> SignalResult:
    sid = "readme_quality"
    vector = Vector.README
    text = ctx.readme_text

    #None = couldn't read it (genuinely missing OR GitHub unavailable). We don't know which, so we don't penalize- report it as not checked instead
    if text is None:
        return SignalResult(
            id=sid, vector=vector, status=Status.INSUFFICIENT, severity=Severity.LOW,
            score=0,
            detail="README not checked (missing, or GitHub unavailable)",
        )
    
    word_count = len(text.split())
    has_link = bool(re.search(r"https?://", text))
    
    if word_count < README_MIN_WORDS:
        return SignalResult(
            id=sid, vector=vector, status=Status.WARN, severity=Severity.LOW,
            score=SEVERITY_POINTS[Severity.LOW],
            detail=f"README is too short ({word_count}/{README_MIN_WORDS} words).",
            evidence={"word_count": word_count, "has_link": has_link},
        )
    
    if not has_link:
        return SignalResult(
            id=sid, vector=vector, status=Status.WARN, severity=Severity.LOW,
            score=SEVERITY_POINTS[Severity.LOW],
            detail=f"README found ({word_count} words) but has no links- demo link may be missing",
            evidence={"word_count": word_count, "has_link": has_link},
        )
    
    return SignalResult(
        id=sid, vector=vector, status=Status.PASS, severity=Severity.LOW, score=0,
        detail=f"README looks good ({word_count} words, has links)",
        evidence={"word_count": word_count, "has_link": has_link},
    )