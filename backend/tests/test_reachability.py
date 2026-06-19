from engine.signals.reachability import playable_reachable
from engine.types import Status


def test_unreachable_fails(make_ctx):
    assert playable_reachable(make_ctx(playable_status=None)).status == Status.FAIL


def test_non_2xx_fails(make_ctx):
    r = playable_reachable(make_ctx(playable_status=404, playable_body_sample="nope"))
    assert r.status == Status.FAIL


def test_empty_body_warns(make_ctx):
    r = playable_reachable(make_ctx(playable_status=200, playable_body_sample=""))
    assert r.status == Status.WARN


def test_placeholder_marker_warns(make_ctx):
    r = playable_reachable(make_ctx(playable_status=200, playable_body_sample="404: not_found"))
    assert r.status == Status.WARN


def test_live_page_passes(make_ctx):
    r = playable_reachable(make_ctx(playable_status=200, playable_body_sample="<html>Welcome to my game</html>"))
    assert r.status == Status.PASS
