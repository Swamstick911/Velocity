"""Reachability: is the Playable URL actually live, or dead / a parked
placeholder page? Placeholder detection covers the 'fake demo' vector"""

from __future__ import annotations

from engine.types import SignalResult, Vector, Status, Severity, SEVERITY_POINTS

#Lowercased substring that signal a default "nothing deployed here" page,
#even when the host returns HTTP 200
PLACEHOLDER_MARKERS = [
    "404: not_found",
    "this page could not be found",
    "page not found",
    "site not found",
    "no such app",
    "there's nothing here yet",
    "deployment not found",
    "no deployment",
    "the page you are looking for",
]

def playable_reachable(ctx) -> SignalResult:
    sid = "reachability_playable_url"
    vector = Vector.REACHABILITY
    status = ctx.playable_status

    if status is None:
        return SignalResult(
            id=sid, vector=vector, status=Status.FAIL, severity=Severity.MEDIUM,
            score=SEVERITY_POINTS[Severity.MEDIUM],
            detail="Playable URL is unreachable or timed out",
        )
    
    if not (200 <= status < 300):
        return SignalResult(
            id=sid, vector=vector, status=Status.FAIL, severity=Severity.MEDIUM,
            score=SEVERITY_POINTS[Severity.MEDIUM],
            detail=f"Playable URL returned HTTP {status}",
            evidence={"status": status},
        )

    body = (ctx.playable_body_sample or "").strip().lower()

    if not body:
        return SignalResult(
            id=sid, vector=vector, status=Status.WARN, severity=Severity.MEDIUM,
            score=SEVERITY_POINTS[Severity.MEDIUM],
            detail=f"Playable URL loads (HTTP {status}) but the page is empty - possible placeholder",
            evidence={"status": status},
        )

    for marker in PLACEHOLDER_MARKERS:
        if marker in body:
            return SignalResult(
                id=sid, vector=vector, status=Status.WARN, severity=Severity.MEDIUM,
                score=SEVERITY_POINTS[Severity.MEDIUM],
                detail=f"Playable URL loads (HTTP {status}) but looks like a placeholder/parked page",
                evidence={"status": status, "marker": marker},
            )

    return SignalResult(
        id=sid, vector=vector, status=Status.PASS, severity=Severity.LOW, score=0,
        detail=f"Playable URL is live (HTTP {status})",
        evidence={"status": status},
    )