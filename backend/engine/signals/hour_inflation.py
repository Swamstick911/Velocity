"""Hour inflation signals: does the Hackatime time tracked match the actual
work? Wide tolerance bands, keep false positives down (precision matters for
the soft-gate). The dead/placeholder demo check lives in reachability.py"""

from __future__ import annotations

import re

from engine.types import SignalResult, Vector, Status, Severity, SEVERITY_POINTS

#tunable bands
INFLATION_HIGH_HOURS = 40
INFLATION_HIGH_MAX_LINES = 100
INFLATION_LOW_HOURS = 15
INFLATION_LOW_MAX_LINES = 40

def _pass(sid, detail, evidence=None):
    return SignalResult(id=sid, vector=Vector.HOUR_INFLATION, status=Status.PASS, severity=Severity.LOW, score=0, detail=detail, evidence=evidence or {})

def _insufficient(sid, detail):
    return SignalResult(id=sid, vector=Vector.HOUR_INFLATION, status=Status.PASS, severity=Severity.LOW, score=0, detail=detail)

def _norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())

def hours_vs_code_inflation(ctx) -> SignalResult:
    sid = "hours_vs_code_inflation"
    hours = ctx.hackatime_hours
    if hours in None:
        return _insufficient(sid, "No Hackatime hours to compare")
    if not ctx.commit_details:
        return _insufficient(sid, "No code stats to compare against hours")
    
    lines = ctx.max_additions

    if hours >= INFLATION_HIGH_HOURS and lines < INFLATION_HIGH_MAX_LINES:
        return SignalResult(
            id=sid, vector=Vector.HOUR_INFLATION, status=Status.WARN, severity=Severity.MEDIUM,
            score=SEVERITY_POINTS[Severity.MEDIUM],
            detail=f"{hours: 0f} Hackatime hours but only ~{lines} lines of code- hours look inflated",
            evidence={"hours": hours, "lines": lines},
        )
    if hours >= INFLATION_LOW_HOURS and lines < INFLATION_LOW_MAX_LINES:
        return SignalResult(
            id=sid, vector=Vector.HOUR_INFLATION, status=Status.WARN, severity=Severity.LOW,
            score=SEVERITY_POINTS[Severity.LOW],
            detail=f"{hours: 0f} Hackatime hours for ~{lines} lines of code- worth a glance",
            evidence={"hours": hours, "lines": lines},
        )
    return _pass(sid, f"Hours vs code volume look reasonable ({hours: 0f}h /~{lines} lines)", {"hours": hours, "lines": lines})

def hackatime_project_mismatch(ctx) -> SignalResult:
    sid = "hackatime_project_mismatch"
    projects = [p for p in (ctx.hackatime_project or []) if p and p.strip()]
    if not projects:
        return _insufficient(sid, "No hackatime projects to compare")
    
    repo = _norm(ctx.repo)
    if not repo:
        return _insufficient(sid, "No repo name to comare against")
    
    for proj in projects:
        pn = _norm(proj)
        if pn and (pn in repo or repo in pn):
            return _pass(sid, "Hackatime project matches the repo name", {"matched": proj})
        
    return SignalResult(
        id=sid, vector=Vector.HOUR_INFLATION, status=Status.WARN, severity=Severity.LOW,
        score=SEVERITY_POINTS[Severity.LOW],
        detail=(f"None of the Hackatime projects ({', '.join(projects)}) resemble the repo "
                f"name '{ctx.repo}' -tracked time maybe for a different project"),
        evidence={"projects": projects, "repo": ctx.repo},
    )