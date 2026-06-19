from datetime import datetime, timedelta, timezone

from engine.signals.ai_slop import (
    ai_single_commit_dump,
    ai_low_cadence_for_size,
    ai_commit_burst,
    ai_generic_readme,
    SINGLE_DUMP_HIGH,
    LOW_CADENCE_ADDITIONS,
)
from engine.types import Status, Severity


def _commit(date):
    return {"sha": "x", "commit": {"author": {"date": date}}}


def _detail(additions):
    return {"stats": {"additions": additions}}


def test_single_commit_dump_flags_high(make_ctx):
    ctx = make_ctx(commits=[_commit("2024-01-01T00:00:00Z")],
                   commit_details=[_detail(SINGLE_DUMP_HIGH + 100)])
    r = ai_single_commit_dump(ctx)
    assert r.status == Status.WARN
    assert r.severity == Severity.HIGH


def test_single_commit_dump_clean_with_many_commits(make_ctx):
    commits = [_commit(f"2024-01-0{i}T00:00:00Z") for i in range(1, 6)]
    ctx = make_ctx(commits=commits, commit_details=[_detail(50)])
    assert ai_single_commit_dump(ctx).status == Status.PASS


def test_single_commit_dump_insufficient_without_data(make_ctx):
    assert ai_single_commit_dump(make_ctx()).status == Status.INSUFFICIENT


def test_low_cadence_for_size_warns(make_ctx):
    commits = [_commit(f"2024-01-0{i}T00:00:00Z") for i in range(1, 5)]  # 4 commits
    ctx = make_ctx(commits=commits, commit_details=[_detail(LOW_CADENCE_ADDITIONS + 100)])
    assert ai_low_cadence_for_size(ctx).status == Status.WARN


def test_commit_burst_warns(make_ctx):
    base = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    commits = [_commit((base + timedelta(minutes=i)).isoformat().replace("+00:00", "Z")) for i in range(3)]
    assert ai_commit_burst(make_ctx(commits=commits)).status == Status.WARN


def test_commit_burst_spread_passes(make_ctx):
    commits = [
        _commit("2024-01-01T00:00:00Z"),
        _commit("2024-02-01T00:00:00Z"),
        _commit("2024-03-01T00:00:00Z"),
    ]
    assert ai_commit_burst(make_ctx(commits=commits)).status == Status.PASS


def test_generic_readme_warns_on_marker(make_ctx):
    r = ai_generic_readme(make_ctx(readme_text="As an AI language model, here is your README"))
    assert r.status == Status.WARN


def test_generic_readme_passes_when_clean(make_ctx):
    r = ai_generic_readme(make_ctx(readme_text="A genuinely written project description with detail."))
    assert r.status == Status.PASS
