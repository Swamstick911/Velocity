"""Orchestrator: run every signal over the prebuilt context, collect the
results, and hand them to scoring. Signals are pure/sync (they only read
the context, which already did all the I/O), so this just iterates. Each
call is guarded so one misbehaving signal can't take down the whole evaluation"""

from __future__ import annotations

import logging

from engine.signals import SIGNALS
from engine.scoring import score_submission
from engine.types import SignalResult, Status, Severity

logger = logging.getLogger("velocity.engine")

def evaluate(ctx) -> dict:
    results: list[SignalResult] = []
    for signal in SIGNALS:
        name = getattr(signal, "__name__", "unknown_signal")
        try:
            results.append(signal(ctx))
        except Exception as e:
            logger.warning("signal %s raised and was skipped: %s", name, e)
            results.append(SignalResult(
                id=name,
                vector="engine",
                status=Status.INSUFFICIENT,
                severity=Severity.LOW,
                score=0,
                detail="Signal errored and was skipped",
            ))

    risk = score_submission(results)
    return {
        "signals": [r.model_dump() for r in results],
        "risk": risk,
    }