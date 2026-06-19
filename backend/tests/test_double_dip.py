from engine.signals.double_dip import (
    dd_normalized_url_match,
    dd_root_commit_match,
    dd_hackatime_project_match,
    _parse_projects,
)
from engine.types import Status, Severity


def test_no_history_passes(make_ctx):
    assert dd_normalized_url_match(make_ctx(history_rows=[])).status == Status.PASS


def test_same_url_other_program_is_double_dip(make_ctx):
    rows = [{"github_url": "https://github.com/octo/widget", "program": "OtherYSWS"}]
    r = dd_normalized_url_match(make_ctx(history_rows=rows, target_program="TestProgram"))
    assert r.status == Status.FAIL
    assert r.severity == Severity.HIGH


def test_same_url_same_program_not_flagged(make_ctx):
    rows = [{"github_url": "https://github.com/octo/widget", "program": "TestProgram"}]
    assert dd_normalized_url_match(make_ctx(history_rows=rows)).status == Status.PASS


def test_url_normalization_catches_variant(make_ctx):
    # different case, trailing slash, and .git suffix — still the same repo
    rows = [{"github_url": "https://github.com/Octo/Widget.git/", "program": "OtherYSWS"}]
    assert dd_normalized_url_match(make_ctx(history_rows=rows)).status == Status.FAIL


def test_root_commit_match_across_renamed_repo(make_ctx):
    rows = [{"github_url": "https://github.com/someoneelse/copy", "program": "OtherYSWS", "root_commit_sha": "deadbeef"}]
    r = dd_root_commit_match(make_ctx(history_rows=rows, root_commit_sha="deadbeef"))
    assert r.status == Status.FAIL


def test_root_commit_insufficient_without_sha(make_ctx):
    assert dd_root_commit_match(make_ctx(root_commit_sha=None)).status == Status.INSUFFICIENT


def test_hackatime_project_reuse_warns(make_ctx):
    rows = [{"github_url": "https://github.com/other/repo", "program": "OtherYSWS", "hackatime_projects": "widget,sideproj"}]
    ctx = make_ctx(history_rows=rows, hackatime_projects=["widget"])
    assert dd_hackatime_project_match(ctx).status == Status.WARN


def test_parse_projects_handles_csv_string():
    assert _parse_projects("a, b ,C") == {"a", "b", "c"}


def test_parse_projects_handles_list():
    assert _parse_projects(["X", " y "]) == {"x", "y"}
