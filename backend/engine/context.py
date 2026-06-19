"""Builds a SubmissionContext once per review: all GitHub + DB reads live here,
each wrapped so a failure degrades to None/empty instead of raising"""

from __future__ import annotations

import re
import base64
import asyncio
import logging

import httpx

from engine.types import SubmissionContext

logger = logging.getLogger("velocity.engine")

GITHUB_API = "https://api.github.com"

def normalize_github_url(url: str) -> str:
    """Canonical form for matching: drop scheme, www, trailing slash, .git, lowercase"""
    u = (url or "").strip().lower()
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\.", "", u)
    u = u.rstrip("/")
    if u.endswith(".git"):
        u = u[:-4]
    return u

def _parse_repo(github_url: str):
    m = re.search(r"github\.com/([^/]+)/([^/?#]+)", github_url or "")
    if not m:
        return None, None
    repo = m.group(2)
    if repo.endswith(".git"):
        repo = repo[:-4]
    return m.group(1), repo

async def _fetch_repo_meta(client: httpx.AsyncClient, owner: str, repo: str):
    try:
        r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}")
        if r.status_code == 200:
            return r.json()
    except httpx.RequestError as e:
        logger.warning("repo_meta fetch failed: %s", e)
    return None

async def _fetch_commits(client: httpx.AsyncClient, owner: str, repo: str):
    try:
        r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits?per_page=30")
        data = r.json() if r.status_code == 200 else None
        if isinstance(data, list):
            return data
    except httpx.RequestError as e:
        logger.warning("commits fetch failed: %s", e)
    return []

async def _fetch_commit_details(client: httpx.AsyncClient, owner: str, repo: str, commits, limit: int = 5):
    """Per-commit detail (for addition/stats). Capped to limit to stay economical"""
    details = []
    for c in commits[:limit]:
        sha = c.get("sha")
        if not sha:
            continue
        try:
            r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits/{sha}")
            if r.status_code == 200:
                details.append(r.json())
        except httpx.RequestError as e:
            logger.warning("commit detail fetch failed: %s", e)
    return details

async def _fetch_readme(client: httpx.AsyncClient, owner: str, repo: str):
    try:
        r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/contents/README.md")
        if r.status_code == 200:
            content = r.json().get("content", "")
            return base64.b64decode(content).decode("utf-8", errors="replace")
    except (httpx.RequestError, ValueError) as e:
        logger.warning("readme fetch failed: %s", e)
    return None

async def _fetch_root_commit_sha(client: httpx.AsyncClient, owner: str, repo: str):
    """Initial commit SHA via the cheap 'link rel=last' pagination trick (1-2 calls)"""
    try:
        r = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits?per_page=1")
        if r.status_code != 200:
            return None
        link = r.headers.get("Link", "")
        m = re.search(r'[?&]page=(\d+)>;\s*rel="last"', link)
        if not m:
            data = r.json()
            return data[-1]["sha"] if isinstance(data, list) and data else None
        last_page = m.group(1)
        r2 = await client.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits?per_page=1&page={last_page}")
        if r2.status_code == 200:
            data = r2.json()
            if isinstance(data, list) and data:
                return data[-1]["sha"]
    except (httpx.RequestError, KeyError, IndexError) as e:
        logger.warning("root commit fetch failed: %s", e)
    return None

async def _check_playable(client: httpx.AsyncClient, url: str):
    """Returns (status_code, body_sample). body sample feeds placeholder detection"""
    try:
        r = await client.get(url)
        body = ""
        try:
            body = r.text[:2000]
        except Exception:
            body = ""
        return r.status_code, body
    except httpx.TimeoutException:
        return None, None
    except httpx.RequestError as e:
        logger.warning("playable check failed: %s", e)
        return None, None
    
def _load_history(get_db):
    """All recorded submissions, signals filter in memory. fine at reviewer scale"""
    try:
        conn = get_db()
        rows = conn.execute("SELECT* FROM submissions").fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.warining("history load failed: %s", e)
        return []
    
async def build_context(
    client: httpx.AsyncClient,
    get_db,
    *,
    github_url: str,
    playable_url: str,
    target_program: str,
    birth_year=None,
    submitter_username=None,
    hackatime_hours=None,
    hackatime_projects=None,
    submitted_at=None,
) -> SubmissionContext:
    owner, repo = _parse_repo(github_url)

    ctx = SubmissionContext(
        github_url=github_url,
        playable_url=playable_url,
        target_program=target_program,
        owner=owner,
        repo=repo,
        birth_year=birth_year,
        submitter_username=submitter_username,
        hackatime_hours=hackatime_hours,
        hackatime_projects=hackatime_projects,
        submitted_at=submitted_at,
    )

    ctx.history_rows = _load_history(get_db)

    playable_task = _check_playable(client, str(playable_url))

    if owner and repo:
        repo_meta, commits, readme_text, root_sha, (p_status, p_body) = await asyncio.gather(
            _fetch_repo_meta(client, owner, repo),
            _fetch_commits(client, owner, repo),
            _fetch_readme(client, owner, repo),
            _fetch_root_commit_sha(client, owner, repo),
            playable_task,
        )
        ctx.repo_meta = repo_meta
        ctx.commits = commits
        ctx.readme_text = readme_text
        ctx.root_commit_sha = root_sha
        ctx.playable_status = p_status
        ctx.playable_body_sample = p_body
        ctx.commit_details = await _fetch_commit_details(client, owner, repo, commits)
    else:
        p_status, p_body = await playable_task
        ctx.playable_status = p_status
        ctx.playable_body_sample = p_body

    return ctx