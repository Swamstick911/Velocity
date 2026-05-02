import os
import re
import httpx
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, field_validator
from dotenv import load_dotenv

#Config
load_dotenv()

GITHUB_TOKEN: str | None = os.getenv("GITHUB_TOKEN")
ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

CURRENT_YEAR = datetime.now().year
MIN_BIRTH_YEAR = 1900
#Minimum realistic age- 13 (COPPA/ Hack club policy)
MAX_BIRTH_YEAR = CURRENT_YEAR - 13

README_MIN_WORDS = 50 #will tune thsi 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("velocity")

#App lifespan [shared async HTTP client (connection pooling)]
@asynccontextmanager
async def lifespan(app: FastAPI):
    headers = {"User-Agent": "Velocity-Preflight/1.0"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    app.state.http_client = httpx.AsyncClient(
        headers=headers,
        timeout=httpx.Timeout(10.0, connect=5.0),
        follow_redirects=True,
    )
    logger.info("HTTP Client initialized. GitHub token %s", "YES" if GITHUB_TOKEN else "NO (ratelimited)")
    yield
    await app.state.http_client.aclose()
    logger.info("HTTP client closed")

app = FastAPI(
    title="Velocity - YSWS Preflight API",
    version="0.1.0",
    description="Automated pre-flight and anti-fraud checks for Hack Club YSWS reviewers",
    lifespan=lifespan,
)

#CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Schemas
class PreflightRequest(BaseModel):
    github_url: HttpUrl
    playable_url: HttpUrl
    birth_year: int

    @field_validator("birth_year")
    @classmethod
    def birth_year_range(cls, v: int) -> int:
        if not (MIN_BIRTH_YEAR <= v <= MAX_BIRTH_YEAR):
            raise ValueError(
                f"Birth year must be between {MIN_BIRTH_YEAR} and {MAX_BIRTH_YEAR}."
            )
        return v
    
class CheckResult(BaseModel):
    passed: bool
    detail: str

class PreflightResponse(BaseModel):
    overall_passed: bool
    birth_year_check: CheckResult
    playable_url_check: CheckResult
    readme_check: CheckResult
    flags: list[str] #human-readable fraud/warning signals

#Helpers
def parse_github_repo(github_url: str) -> tuple[str, str] | None:
    """
    Extracts (owner, repo) from URLs like:
    https://github.com/owner/repo
    https://github.com/owner/repo/tree/main
    Returns none if parsing fails
    """
    pattern = r"github\.com/([^/]+)/([^/?#]+)"
    match = re.search(pattern, str(github_url))
    if not match:
        return None
    owner = match.group(1)
    repo = match.group(2)
    return owner, repo

async def check_birth_year(birth_year: int) -> CheckResult:
    """
    Flags obvious placeholder entries (eg. current year, future years, or impossibly old years)
    Pydantic already enforces the hard range, this adds soft fraud-signal logic
    """
    flags = []
    age = CURRENT_YEAR - birth_year

    if birth_year == CURRENT_YEAR:
        return CheckResult(
            passed=False,
            detail=f"Birth year {birth_year} is the current year, you must be just born"
        )
    if age < 13:
        return CheckResult(
            passed=False,
            detail=f"Calculated age {age} is under 13, too young to participate, wait a few years and try again :) "
        )
    if age > 18:
        return CheckResult(
            passed=False,
            detail=f"Calculate age {age} is over 18, too old to participate, should've applied earlier :("
        )
    return CheckResult(
        passed=True,
        detail=f"Birth year {birth_year} is eligible (age ~ {age})" + ("⚠ " + "; ".join(flags) if flags else ""),
    )

async def check_playable_url(client: httpx.AsyncClient, url: str) -> CheckResult:
    """
    Performs a HEAD request (falls back to GET) to confirm the URL is reachable
    and returns a 2xx status code
    """
    try:
        resp = await client.head(str(url))
        #Some servers don't handle HEAD- fall back gracefully
        if resp.status_code == 405:
            resp = await client.get(str(url))
        if 200 <= resp.status_code < 300:
            return CheckResult(
                passed=True,
                detail=f"URL is live (HTTP {resp.status_code}).",
            )
        return CheckResult(
            passed=False,
            detail=f"URL returned HTTP {resp.status_code} - unreachable/invalid"
        )
    except httpx.TimeoutException:
        return CheckResult(passed=False, detail="URL timed out after 10 seconds")
    except httpx.RequestError as e:
        return CheckResult(passed=False, detail=f"Network Error: {e}")
    
async def check_readme(
    client: httpx.AsyncClient, owner: str, repo: str
) -> tuple[CheckResult, list[str]]:
    """
    Uses the Github Contents API to:
    1. Confirm the README.md exists
    2. Verify it meets the minimum word count
    3. Check for atleast one http/https link (demo link)
    Returns (CheckResult, additional flags)
    """
    flags: list[str] = []

    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/README.md"
    try:
        resp = await client.get(api_url)
    except httpx.RequestError as e:
        return CheckResult(passed=False, detail=f"Github API request failed: {e}"), flags

    if resp.status_code == 404:
        return CheckResult(passed=False, detail="README.md not found in the repository root"), flags
    if resp.status_code == 403:
        return CheckResult(
            passed=False,
            detail="Github API rate limit exceeded. Add a GITHUB_TOKEN to .env to increase limits",
        ), flags
    if resp.status_code != 200:
        return CheckResult(
            passed=False,
            detail=f"Unexpected Github API response: HTTP {resp.status_code}",
        ), flags

    data = resp.json()

    #Decode content (github returns base64)
    import base64
    try:
        raw_content = base64.b64decode(data.get("content", "")).decode("utf-8", errors="replace")
    except Exception:
        return CheckResult(passed=False, detail="Could not decode README content"), flags

    word_count = len(raw_content.split())
    has_link = bool(re.search(r"https?://", raw_content))

    if word_count < README_MIN_WORDS:
        flags.append(f"README is very short ({word_count} words, minimum {README_MIN_WORDS}).")
        return CheckResult(
            passed=False,
            detail=f"README exists but is too short ({word_count}/{README_MIN_WORDS} words)."
        ), flags
    
    if not has_link:
        flags.append("README contains no hyperlinks, demo link may be missing")

    return CheckResult(
        passed=True,
        detail=f"README.md found ({word_count} words). {'No demo link detected' if not has_link else ''}",
    ), flags

#Endpoint
@app.post("/api/v1/preflight", response_model=PreflightResponse)
async def run_preflight(payload: PreflightRequest):
    """
    Runs all automated pre-flight checks on a YSWS submission
    All checks are run concurrently for speed
    """
    import asyncio

    client: httpx.AsyncClient = app.state.http_client
    flags: list[str] = []

    #Parse GitHub URL early- fail fast if malformed
    parsed = parse_github_repo(str(payload.github_url))
    if not parsed: 
        raise HTTPException(
            status_code=422,
            detail="Could not parse GitHub owner/repo from the provided github_url",
        )
    owner, repo = parsed
    logger.info("Preflight started | repo=%s/%s", owner, repo)

    #Run all checks concurrently
    birth_result, playable_result, (readme_result, readme_flags) = await asyncio.gather(
        check_birth_year(payload.birth_year),
        check_playable_url(client, str(payload.playable_url)),
        check_readme(client, owner, repo),
    )

    flags.extend(readme_flags)

    #Overall pass/fail
    overall = birth_result.passed and playable_result.passed and readme_result.passed

    logger.info(
        "Preflight done | repo=%s/%s | passed=%s | flags=%d",
        owner, repo, overall, len(flags),
    )

    return PreflightResponse(
        overall_passed=overall,
        birth_year_check=birth_result,
        playable_url_check=playable_result,
        readme_check=readme_result,
        flags=flags,
    )

#Health Check
@app.get("/health")
async def health():
    return {"status": "ok", "version": app.version}