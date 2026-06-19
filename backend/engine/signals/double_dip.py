"""Double-dip/reship signals. Beyond the old exact-URL match: catches
normalized URL variants, forks/renames via identical git history (root
commit), and the same Hackatime project reused across submissions.

Reads ctx.history_rows (recorded submissions). New columns referenced here
(root_commit_sha, hackatime_projects) are added in the DB migration step, so
everything uses .get() to tolerate older rows."""

from __future__ import annotations

from engine.types import SignalResult, Vector, Status, Severity, SEVERITY_POINTS
from engine.context import normalize_github_url

def _pass(sid, detail):
    return SignalResult(id=sid, vector=Vector.DOUBLE_DIP, status=Status.PASS, severity=Severity.LOW, score=0, detail=detail)

def _insufficient(sid, detail):
    return SignalResult(id=sid, vector=Vector.DOUBLE_DIP, status=Status.INSUFFICIENT, severity=Severity.LOW, score=0, detail=detail)

def _parse_projects(raw):
    if not raw:
        return set()
    if isinstance(raw, list):
        return {p.strip().lower() for p in raw if p and p.strip()}
    return {p.strip().lower() for p in str(raw).split(",") if p.strip()}

def dd_normalized_url_match(ctx) -> SignalResult:
    sid = "dd_normalized_url_match"
    if not ctx.history_rows:
        return _pass(sid, "No prior submissions on record")

    cur = normalize_github_url(ctx.github_url)
    other_programs = []
    for row in ctx.history_rows:
        if normalize_github_url(row.get("github_url", "")) != cur:
            continue
        prog = row.get("program")
        if prog and prog != ctx.target_program:
            other_programs.append(prog)

    if other_programs:
        progs = sorted(set(other_programs))
        return SignalResult(
            id=sid, vector=Vector.DOUBLE_DIP, status=Status.FAIL, severity=Severity.HIGH,
            score=SEVERITY_POINTS[Severity.HIGH],
            detail=f"Same repo was already submitted to {', '.join(progs)}. Possible double-dip",
            evidence={"programs": progs},
        )

    return _pass(sid, "Repo URL not seen on another program")

def dd_root_commit_match(ctx) -> SignalResult:
    sid = "dd_root_commit_match"
    if not ctx.root_commit_sha:
        return _insufficient(sid, "Root commit unavailable; ancestry not checked")
    if not ctx.history_rows:
        return _pass(sid, "No prior submissions on record")

    cur_url = normalize_github_url(ctx.github_url)
    matches = []
    for row in ctx.history_rows:
        if row.get("root_commit_sha") != ctx.root_commit_sha:
            continue
        row_url = normalize_github_url(row.get("github_url", ""))
        if row_url != cur_url:
            matches.append((row_url, row.get("program")))

    if matches:
        where = ", ".join(sorted({f"{u} ({p})" for u, p in matches}))
        return SignalResult(
            id=sid, vector=Vector.DOUBLE_DIP, status=Status.FAIL, severity=Severity.HIGH,
            score=SEVERITY_POINTS[Severity.HIGH],
            detail=f"Identical git history (same root commit) as: {where}. Likely a fork/rename/reship",
            evidence={"root_commit_sha": ctx.root_commit_sha, "matches": [u for u, _ in matches]},
        )
    return _pass(sid, "Git history not seen under another repo")

def dd_hackatime_project_match(ctx) -> SignalResult:
    sid = "dd_hackatime_project_match"
    cur_projects = {p.strip().lower() for p in (ctx.hackatime_projects or []) if p and p.strip()}
    if not cur_projects:
        return _insufficient(sid, "No Hackatime projects to compare")

    cur_url = normalize_github_url(ctx.github_url)
    hits = []
    for row in ctx.history_rows:
        if normalize_github_url(row.get("github_url", "")) == cur_url:
            continue
        shared = cur_projects & _parse_projects(row.get("hackatime_projects"))
        if shared:
            hits.append((row.get("program"), sorted(shared)))

    if hits:
        shared_all = sorted({p for _, ps in hits for p in ps})
        return SignalResult(
            id=sid, vector=Vector.DOUBLE_DIP, status=Status.WARN, severity=Severity.MEDIUM,
            score=SEVERITY_POINTS[Severity.MEDIUM],
            detail=f"Hackatime project(s) {', '.join(shared_all)} were also tracked for a different submission",
            evidence={"shared_projects": shared_all},
        )
    return _pass(sid, "Hackatime projects not reused across submissions")
