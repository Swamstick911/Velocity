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
    