from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from pydantic import BaseModel

#Vocabulary
class Vector:
    AI_SLOP = "ai_slop"
    DOUBLE_DIP = "double_dip"
    HOUR_INFLATION = "hour_inflation"
    ELIGIBILITY = "eligibility"
    REACHABILITY = "reachability"
    README = "readme"

class Status:
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"
    INSUFFICIENT = "insufficient_data"

class Severity:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Tier:
    CLEAN = "clean"
    REVIEW = "review"
    FLAGGED = "flagged"

class Gate:
    NONE = "none"
    WARN = "warn"
    BLOCK = "block"

#Tunable Score config
SEVERITY_POINTS = {
    Severity.LOW: 10,
    Severity.MEDIUM: 25,
    Severity.HIGH: 50,
}

#Overall risk-score thresholds (sum of all signal scores)
TIER_REVIEW_MIN = 30
TIER_FLAGGED_MIN = 60

#Uniform output of every signal
class SignalResult(BaseModel):
    id: str
    status: str
    severity: str
    score: int = 0
    detail: str = ""
    evidence: dict[str, Any] = {}

#Per submission shared context (built once, read by every signal)
@dataclass
class SubmissionContext:
    #raw inps
    github_url: str
    playable_url: str
    target_program: str
    owner: Optional[str] = None
    repo: Optional[str] = None
    birth_year: Optional[int] = None
    submitter_username: Optional[str] = None
    hackatime_hours: Optional[float] = None
    hackatime_projects: Optional[str] = field(default_factory=list)
    submitted_at: Optional[str] = None
    
    #fetched once data (None/empty when unavailable- signals degrade, never crash)
    repo_meta: Optional[dict] = None
    commits: list[dict] = field(default_factory=list)
    commit_details: list[dict] = field(default_factory=list)
    readme_text: Optional[str] = None
    root_commit_sha: Optional[str] = None
    playable_status: Optional[int] = None
    playable_body_sample: Optional[str] = None

    #history rows for double-dip/reship lookups
    history_rows: list[dict] = field(default_factory=list)

    #convinience accessors
    @property
    def commit_count(self) -> int:
        return len(self.commits)
    
    @property
    def max_additions(self) -> int:
        adds = [d.get("stats", {}).get("additions", 0) for d in self.commit_details]
        return max(adds) if adds else 0
    
    @property
    def repo_name_lower(self) -> str:
        return (self.repo or "").lower()