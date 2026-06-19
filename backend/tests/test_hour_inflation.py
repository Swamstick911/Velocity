from engine.signals.hour_inflation import (
    hours_vs_code_inflation,
    hackatime_project_mismatch,
    INFLATION_HIGH_HOURS,
    INFLATION_HIGH_MAX_LINES,
)
from engine.types import Status


def _detail(additions):
    return {"stats": {"additions": additions}}


def test_no_hours_insufficient(make_ctx):
    assert hours_vs_code_inflation(make_ctx(hackatime_hours=None)).status == Status.INSUFFICIENT


def test_inflated_hours_warn(make_ctx):
    ctx = make_ctx(hackatime_hours=INFLATION_HIGH_HOURS + 10,
                   commit_details=[_detail(INFLATION_HIGH_MAX_LINES - 10)])
    assert hours_vs_code_inflation(ctx).status == Status.WARN


def test_reasonable_hours_pass(make_ctx):
    ctx = make_ctx(hackatime_hours=20, commit_details=[_detail(5000)])
    assert hours_vs_code_inflation(ctx).status == Status.PASS


def test_project_name_matches_repo_passes(make_ctx):
    assert hackatime_project_mismatch(make_ctx(repo="widget", hackatime_projects=["widget"])).status == Status.PASS


def test_project_name_mismatch_warns(make_ctx):
    assert hackatime_project_mismatch(make_ctx(repo="widget", hackatime_projects=["totally-different"])).status == Status.WARN


def test_no_projects_insufficient(make_ctx):
    assert hackatime_project_mismatch(make_ctx(hackatime_projects=None)).status == Status.INSUFFICIENT
