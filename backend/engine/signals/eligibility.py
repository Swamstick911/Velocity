from __future__ import annotations

from datetime import datetime

from engine.types import SignalResult, Vector, Status, Severity, SEVERITY_POINTS

MIN_AGE = 13
MAX_AGE = 18

def _fail(detail: str, evidence: dict) -> SignalResult:
    return SignalResult(
        id="eligibility_birth_year",
        vector=Vector.ELIGIBILITY,
        status=Status.FAIL,
        severity=Severity.HIGH,
        score=SEVERITY_POINTS[Severity.HIGH],
        detail=detail,
        evidence=evidence,
    )

def birth_year_eligibility(ctx) -> SignalResult:
    if ctx.birth_year is None:
        return SignalResult(
            id="eligibility_birth_year",
            vector=Vector.ELIGIBILITY,
            status=Status.INSUFFICIENT,
            severity=Severity.LOW,
            score=0,
            detail="No birth year provided, eligibility not checked",
        )

    current_year = datetime.now().year
    age = current_year - ctx.birth_year

    if ctx.birth_year == current_year:
        return _fail(
            f"Birth year {ctx.birth_year} is the current year - likely a placeholder",
            {"birth_year": ctx.birth_year, "age": age},
        )

    if age < MIN_AGE:
        return _fail(
            f"Age ~{age} is under {MIN_AGE} too young to participate",
            {"birth_year": ctx.birth_year, "age": age},
        )
    
    if age > MAX_AGE:
        return _fail(
            f"Age ~{age} is over {MAX_AGE}, outside the eligible range",
            {"age": age},
        )
    
    return SignalResult(
        id="eligibility_birth_year",
        vector=Vector.ELIGIBILITY,
        status=Status.PASS,
        severity=Severity.LOW,
        score=0,
        detail=f"Eligible (age ~{age}).",
        evidence={"age": age},
    )