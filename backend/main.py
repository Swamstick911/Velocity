import os
import re
import httpx
import logging
import sqlite3
import secrets
import hashlib
import base64
from datetime import datetime
from contextlib import asynccontextmanager
import json

from fastapi.responses import RedirectResponse
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, field_validator
from dotenv import load_dotenv
from starlette.middleware.sessions import SessionMiddleware
from urllib.parse import urlencode
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from engine.context import build_context, _fetch_root_commit_sha
from engine.runner import evaluate

#Config
load_dotenv()

GITHUB_TOKEN: str | None = os.getenv("GITHUB_TOKEN")
ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

AIRTABLE_CLIENT_ID = os.getenv("AIRTABLE_CLIENT_ID")
AIRTABLE_CLIENT_SECRET = os.getenv("AIRTABLE_CLIENT_SECRET")
AIRTABLE_REDIRECT_URI = os.getenv("AIRTABLE_REDIRECT_URI")
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET", secrets.token_hex(32))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

auth_code_signer = URLSafeTimedSerializer(SESSION_SECRET_KEY, salt="oauth-handoff")

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_API_URL = "https://slack.com/api/chat.postMessage"
SCAN_TTL_SECONDS = 24 * 3600

CURRENT_YEAR = datetime.now().year
MIN_BIRTH_YEAR = 1900
#Minimum realistic age- 13 (COPPA/ Hack club policy)
MAX_BIRTH_YEAR = CURRENT_YEAR - 13

README_MIN_WORDS = 50 #will tune thsi 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("velocity")

def get_db():
    conn = sqlite3.connect("velocity.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS reviewers (
            email TEXT PRIMARY KEY,
            airtable_access_token TEXT,
            airtable_refresh_token TEXT,
            airtable_token_expires_at INTEGER,
            airtable_base_id TEXT,
            airtable_table_name TEXT
        );

        CREATE TABLE IF NOT EXISTS submissions (
            github_url TEXT NOT NULL,
            program TEXT NOT NULL,
            approved_at INTEGER,
            PRIMARY KEY(github_url, program)
        );
        
        CREATE TABLE IF NOT EXISTS scan_results (
            submission_id TEXT PRIMARY KEY,
            github_url TEXT,
            tier TEXT,
            score INTEGER,
            gate TEXT,
            result_json TEXT,
            scanned_at INTEGER
        );
    """)
    try:
        conn.execute("ALTER TABLE reviewers ADD COLUMN airtable_base_id TEXT")
    except:
        pass
    try:
        conn.execute("ALTER TABLE reviewers ADD COLUMN airtable_table_name TEXT")
    except:
        pass
    try:
        conn.execute("ALTER TABLE reviewers ADD COLUMN column_mapping TEXT")
    except:
        pass

    #Anti fraud fingerprint columns on submissions (migrate older DBs)
    for col in ("owner", "repo", "root_commit_sha", "hackatime_projects", "submitter_username"):
        try:
            conn.execute(f"ALTER TABLE submissions ADD COLUMN {col} TEXT")
        except:
            pass

    conn.commit()
    conn.close()

#App lifespan [shared async HTTP client (connection pooling)]
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    headers = {
        "User-Agent": "Velocity-Preflight/1.0",
        "Accept": "application/vnd.github.v3+json",
    }
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

app.add_middleware(
    SessionMiddleware, 
    secret_key=SESSION_SECRET_KEY,
    same_site="none",
    https_only=True,
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
    birth_year: int | None = None
    target_program: str = "Unknown YSWS"
    hackatime_hours: float | None = None
    hackatime_projects: list[str] | None = None

class RiskSignal(BaseModel):
    id: str
    vector: str
    status: str
    severity: str
    score: int
    detail: str
    evidence: dict = {}

class RiskReport(BaseModel):
    tier: str
    score: int
    gate: str
    by_vector: dict[str, int]
    signals: list[RiskSignal]

class CheckResult(BaseModel):
    passed: bool
    detail: str

class PreflightResponse(BaseModel):
    overall_passed: bool
    birth_year_check: CheckResult
    playable_url_check: CheckResult
    readme_check: CheckResult
    anti_fraud_check: CheckResult
    flags: list[str] #human-readable fraud/warning signals
    risk: RiskReport

class PreviousSubmission(BaseModel):
    github_url: str
    program: str
    approved_at: int | None

class SlackNotify(BaseModel):
    slack_id: str | None = None
    decision: str
    repo: str = ""
    program: str = ""
    reason: str | None = None


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

def _build_preflight_response(signals, risk) -> PreflightResponse:
    by_id = {s["id"]: s for s in signals}

    def _check(sig):
        if not sig:
            return CheckResult(passed=True, detail="Not checked")
        passed = sig["status"] in ("pass", "insufficient_data")
        return CheckResult(passed=passed, detail=sig["detail"])

    fraud_vectors = {"ai_slop", "double_dip", "hour_inflation"}
    fraud_hits = [s for s in signals if s["vector"] in fraud_vectors and s["status"] in ("warn", "fail")]
    if fraud_hits:
        worst = max(fraud_hits, key=lambda s: s["score"])
        anti_fraud_check = CheckResult(passed=False, detail=worst["detail"])
    else:
        anti_fraud_check = CheckResult(passed=True, detail="No fraud signals detected")

    flags = [s["detail"] for s in signals if s["status"] in ("warn", "fail")]

    return PreflightResponse(
        overall_passed=risk["tier"] == "clean",
        birth_year_check=_check(by_id.get("eligibility_birth_year")),
        playable_url_check=_check(by_id.get("reachability_playable_url")),
        readme_check=_check(by_id.get("readme_quality")),
        anti_fraud_check=anti_fraud_check,
        flags=flags,
        risk=RiskReport(
            tier=risk["tier"], score=risk["score"], gate=risk["gate"], by_vector=risk["by_vector"], signals=signals,
        ),
    )

#Endpoint
@app.post("/api/v1/preflight", response_model=PreflightResponse)
async def run_preflight(payload: PreflightRequest):
    """
    Runs the anti-fraud engine- build the context once (all GitHub/DB reads),
    evaluate every signal, then map the result back to the legacy check fields
    plus a new risk report
    """
    parsed = parse_github_repo(str(payload.github_url))
    if not parsed:
        raise HTTPException(
            status_code=422,
            detail="Could not parse GitHub owner/repo from the provided github_url",
        )
    owner, repo = parsed
    logger.info("Preflight started | repo=%s/%s | program=%s", owner, repo, payload.target_program)

    ctx = await build_context(
        app.state.http_client,
        get_db,
        github_url=str(payload.github_url),
        playable_url=str(payload.playable_url),
        target_program=payload.target_program,
        birth_year=payload.birth_year,
        hackatime_hours=payload.hackatime_hours,
        hackatime_projects=payload.hackatime_projects,
    )

    result = evaluate(ctx)
    signals = result["signals"]
    risk = result["risk"]
    
    logger.info(
        "Preflight done | repo=%s/%s | tier=%s | score=%d",
        owner, repo, risk["tier"], risk["score"],
    )
    return _build_preflight_response(signals, risk)

class ScanRunRequest(BaseModel):
    submission_id: str
    github_url: HttpUrl
    playable_url: HttpUrl
    birth_year: int | None = None
    target_program: str = "Unknown YSWS"
    hackatime_hours: float | None = None
    hackatime_projects: list[str] | None = None

@app.post("/api/scan/run", response_model=PreflightResponse)
async def scan_run(payload: ScanRunRequest):
    """Scan one submission and cache the result (powers the triage queue)"""
    parsed = parse_github_repo(str(payload.github_url))
    if not parsed:
        raise HTTPException(status_code=422, detail="Could not parse GitHub owner/repo")
    
    ctx = await build_context(
        app.state.http_client,
        get_db,
        github_url=str(payload.github_url),
        playable_url=str(payload.playable_url),
        target_program=payload.target_program,
        birth_year=payload.birth_year,
        hackatime_hours=payload.hackatime_hours,
        hackatime_projects=payload.hackatime_projects,
    )
    result = evaluate(ctx)
    risk = result["risk"]
    response = _build_preflight_response(result["signals"], risk)
    
    conn = get_db()
    conn.execute("""
        INSERT INTO scan_results
            (submission_id, github_url, tier, score, gate, result_json, scanned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(submission_id) DO UPDATE SET
            github_url=excluded.github_url, tier=excluded.tier, score=excluded.score,
            gate=excluded.gate, result_json=excluded.result_json, scanned_at=excluded.scanned_at
    """, (
        payload.submission_id, str(payload.github_url), risk["tier"], risk["score"],
        risk["gate"], response.model_dump_json(), int(datetime.now().timestamp()),
    ))
    conn.commit()
    conn.close()
    return response

class ScanResultRequest(BaseModel):
    ids: list[str]

@app.post("/api/scan/results")
async def scan_results(payload: ScanResultRequest):
    """Return cached scans still within the TTL + which ids are stale/missing"""
    if not payload.ids:
        return {"results": {}, "stale": []}
    
    cutoff = int(datetime.now().timestamp()) - SCAN_TTL_SECONDS
    placeholders = ",".join(["?"] * len(payload.ids))
    conn = get_db()
    rows = conn.execute(
        f"""SELECT submission_id, tier, score, gate, result_json, scanned_at
            FROM scan_results WHERE submission_id IN ({placeholders})""",
        payload.ids,
    ).fetchall()
    conn.close()

    results = {}
    fresh = set()
    for row in rows:
        if row["scanned_at"] and row["scanned_at"] >= cutoff:
            results[row["submission_id"]] = {
                "tier": row["tier"],
                "score": row["score"],
                "gate": row["gate"],
                "result": json.loads(row["result_json"]) if row["result_json"] else None,
            }
            fresh.add(row["submission_id"])
    stale = [i for i in payload.ids if i not in fresh]
    return {"results": results, "stale": stale}

#Health Check
@app.get("/health")
async def health():
    return {"status": "ok", "version": app.version}

@app.get("/api/auth/login")
async def airtable_login(request: Request):
    state = secrets.token_hex(16)

    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()

    request.session["oauth_state"] = state
    request.session["code_verifier"] = code_verifier

    params = urlencode({
        "client_id": AIRTABLE_CLIENT_ID,
        "redirect_uri": AIRTABLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "data.records:read data.records:write schema.bases:read user.email:read",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    })

    return RedirectResponse(f"https://airtable.com/oauth2/v1/authorize?{params}")

@app.get("/api/auth/callback")
async def airtable_callback(request: Request, code: str | None = None, state: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(status_code=400, detail=f"Airtable OAuth error: {error}")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state from Airtable")
    if state != request.session.get("oauth_state"):
        raise HTTPException(status_code=400, detail="Invalid state")
    
    code_verifier = request.session.get("code_verifier")
    if not code_verifier:
        raise HTTPException(status_code=400, detail="Missing code verifier in session")
    
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://airtable.com/oauth2/v1/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": AIRTABLE_REDIRECT_URI,
                "code_verifier": code_verifier,
            },
            auth=(AIRTABLE_CLIENT_ID, AIRTABLE_CLIENT_SECRET),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_resp.text}")
        
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_at = int(datetime.now().timestamp()) + token_data.get("expires_in", 3600)

        user_resp = await client.get(
            "https://api.airtable.com/v0/meta/whoami",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch Airtable user info")
        
        email = user_resp.json().get("email")
        if not email:
            raise HTTPException(status_code=400, detail="No email returned from Airtable")
        
        conn = get_db()
        conn.execute("""
            INSERT INTO reviewers
                (email, airtable_access_token, airtable_refresh_token, airtable_token_expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                airtable_access_token = excluded.airtable_access_token,
                airtable_refresh_token = excluded.airtable_refresh_token,
                airtable_token_expires_at = excluded.airtable_token_expires_at
        """, (email, access_token, refresh_token, expires_at))
        conn.commit()
        conn.close()

        request.session["email"] = email
    handoff = auth_code_signer.dumps(email)
    return RedirectResponse(f"{FRONTEND_URL}/dashboard?email={email}")

@app.post("api/auth/exchange")
async def exchange_code(request: Request):
    body = await request.json()
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    try:
        email = auth_code_signer.loads(code, max_age=120)
    except SignatureExpired:
        raise HTTPException(status_code=401, detail="Login code expired, please try again")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid login code")
    return await _reviewer_config_payload(email)

@app.get("/api/auth/me")
async def get_me(request: Request):
    email = request.session.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not logged in")
    return {"email": email}

@app.get("/api/config/get")
async def _reviewer_config_payload(email: str) -> dict:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM reviewers WHERE email = ?", (email,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="No config found for this email")
    
    access_token = row["airtable_access_token"]
    expires_at = row["airtable_token_expires_at"] or 0

    #Refresh if token expires within 5 minutes
    if int(datetime.now().timestamp()) >= expires_at - 300:
        refresh_token = row["airtable_refresh_token"]
        if refresh_token:
            async with httpx.AsyncClient() as client:
                token_resp = await client.post(
                    "https://airtable.com/oauth2/v1/token",
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": refresh_token,
                    },
                    auth=(AIRTABLE_CLIENT_ID, AIRTABLE_CLIENT_SECRET),
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
            if token_resp.status_code == 200:
                token_data = token_resp.json()
                access_token = token_data.get("access_token")
                new_refresh = token_data.get("refresh_token", refresh_token)
                new_expires = int(datetime.now().timestamp()) + token_data.get("expires_in", 3600)
                conn = get_db()
                conn.execute("""
                    UPDATE reviewers
                    SET airtable_access_token = ?,
                        airtable_refresh_token = ?,
                        airtable_token_expires_at = ?
                    WHERE email = ?
                """, (access_token, new_refresh, new_expires, email))
                conn.commit()
                conn.close()
                logger.info("Refreshed Airtable token for %s", email)

    return {
        "email": row["email"],
        "airtable_access_token": access_token,
        "airtable_base_id": row["airtable_base_id"],
        "airtable_table_name": row["airtable_table_name"],
        "column_mapping": json.loads(row["column_mapping"]) if row["column_mapping"] else None,
    }

@app.get("api/config/get")
async def get_config(request: Request):
    email = request.session.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not logged in")
    return await _reviewer_config_payload(email)

@app.post("/api/auth/logout")
async def logout(request: Request):
    request.session.clear()
    return {"success": True}

@app.post("/api/config/save")
async def save_config(request: Request):
    body = await request.json()
    base_id = body.get("airtable_base_id")
    table_name = body.get("airtable_table_name")
    column_mapping = body.get("column_mapping")
    access_token = body.get("airtable_access_token")

    email = request.session.get("email")
    if not email:
        if not access_token:
            raise HTTPException(status_code=401, detail="Not logged in")
        conn = get_db()
        row = conn.execute(
            "SELECT email FROM reviewers WHERE airtable_access_token = ?", (access_token,)
        ).fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=401, detail="Not logged in")
        email = row["email"]

    if not base_id or not table_name:
        raise HTTPException(status_code=400, detail="Missing required fields")

    conn = get_db()
    conn.execute("""
        UPDATE reviewers
        SET airtable_base_id = ?, airtable_table_name = ?, column_mapping = ?
        WHERE email = ?
    """, (base_id, table_name, json.dumps(column_mapping) if column_mapping is not None else None, email))
    conn.commit()
    conn.close()

    return {"success": True}

class SubmissionRecord(BaseModel):
    github_url: str
    program: str
    submitter_username: str | None = None
    hackatime_projects: list[str] | str | None = None

@app.post("/api/submissions/record")
async def record_submission(payload: SubmissionRecord):
    clean_url = payload.github_url.lower().rstrip('/')

    parsed = parse_github_repo(payload.github_url)
    owner, repo = parsed if parsed else (None, None)

    root_sha = None
    if owner and repo:
        root_sha = await _fetch_root_commit_sha(app.state.http_client, owner, repo)
    
    projects = payload.hackatime_projects
    if isinstance(projects, list):
        projects_csv = ",".join(p.strip() for p in projects if p and p.strip())
    elif isinstance(projects, str):
        projects_csv = projects.strip()
    else:
        projects_csv = ""
        
    conn = get_db()
    conn.execute("""
        INSERT OR IGNORE INTO submissions
            (github_url, program, approved_at, owner, repo,
             root_commit_sha, hackatime_projects, submitter_username)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (clean_url, payload.program, int(datetime.now().timestamp()),
        owner, repo, root_sha, projects_csv, payload.submitter_username,
    ))
    conn.commit()
    conn.close()
    return {"success": True}


@app.get("/api/submissions/history")
async def submission_history(github_url: str):
    clean_url = github_url.lower().rstrip("/")

    conn = get_db()
    rows = conn.execute("""
        SELECT github_url, program, approved_at
        FROM submissions
        WHERE github_url = ?
        ORDER BY approved_at DESC
    """, (clean_url,)).fetchall()
    conn.close()

    return [
        {
            "github_url": row["github_url"],
            "program": row["program"],
            "approved_at": row["approved_at"],
        }
        for row in rows
    ]

class HistoryCountRequest(BaseModel):
    github_urls: list[str]

@app.post("/api/submissions/history-counts")
async def get_history_counts(payload: HistoryCountRequest):
    """
    Takes a list of GitHub URLs and returns a mapping of URL to show approved count
    """
    if not payload.github_urls:
        return {}
    
    #Clean the URLs the same way we do on insert
    clean_urls = [url.lower().rstrip('/') for url in payload.github_urls]

    conn = get_db()

    #Use SQLite's parameter substitution for IN clause
    placeholders = ",".join(["?"] * len(clean_urls))
    query = f"""
        SELECT github_url, COUNT(program) as count
        FROM submissions
        WHERE github_url IN ({placeholders})
        GROUP BY github_url
    """

    rows = conn.execute(query, clean_urls).fetchall()
    conn.close()

    #Build the results map
    counts = {}
    for row in rows:
        counts[row["github_url"]] = row["count"]

    #Also ensure URLs with 0 history are included in the response
    for url in clean_urls:
        if url not in counts:
            counts[url] = 0

    return counts

@app.get("/")
async def root():
    return {"status": "ok", "message": "Velocity backend is running"}

@app.post("/api/slack/notify")
async def slack_notify(payload: SlackNotify):
    """DM the submitter about an approve/reject decision. Never blocks the review:
    no token / no slack_id / Slack errors all return a soft result"""
    if not payload.slack_id:
        return {"ok": False, "skipped": "no_slack_id"}
    if not SLACK_BOT_TOKEN:
        logger.warning("Slack notify skipped: SLACK_BOT_TOKEN not set")
        return {"ok": False, "skipped": "no_token"}
    
    repo = payload.repo or "your project"
    program = payload.program or "the program"

    if payload.decision == "approved":
        text = f" *{repo}* got approved for *{program}*! Nice work, see you in the next one"
    else:
        reason = (payload.reason or "").strip() or "Reach out to your reviewer for details"
        text = (
            f"Hey! Your submission *{repo}* for  *{program}* needs another pass:\n\n"
            f"> {reason}\n\n"
            f"Patch it up and resubmit!"
        )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                SLACK_API_URL,
                headers={
                    "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
                    "Content-Type": "application/json; charset=utf-8",
                },
                json={"channel": payload.slack_id, "text": text},
            )
        data = resp.json()
        if not data.get("ok"):
            logger.warning("Slack notify failed %s", data.get("error"))
            return {"ok": False, "error": data.get("error")}
        return {"ok": True}
    except Exception as e:
        logger.warning("Slack notify error: %s", e)
        return {"ok": False, "error": str(e)}