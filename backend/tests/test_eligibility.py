from datetime import datetime

from engine.signals.eligibility import birth_year_eligibility
from engine.types import Status, Severity

YEAR = datetime.now().year


def test_no_birth_year_is_insufficient(make_ctx):
    r = birth_year_eligibility(make_ctx(birth_year=None))
    assert r.status == Status.INSUFFICIENT
    assert r.score == 0


def test_eligible_age_passes(make_ctx):
    assert birth_year_eligibility(make_ctx(birth_year=YEAR - 16)).status == Status.PASS


def test_too_young_fails_high(make_ctx):
    r = birth_year_eligibility(make_ctx(birth_year=YEAR - 10))
    assert r.status == Status.FAIL
    assert r.severity == Severity.HIGH


def test_too_old_fails(make_ctx):
    assert birth_year_eligibility(make_ctx(birth_year=YEAR - 25)).status == Status.FAIL


def test_current_year_is_placeholder_fail(make_ctx):
    assert birth_year_eligibility(make_ctx(birth_year=YEAR)).status == Status.FAIL
