from engine.signals.readme import readme_quality, README_MIN_WORDS
from engine.types import Status


def test_missing_readme_insufficient(make_ctx):
    assert readme_quality(make_ctx(readme_text=None)).status == Status.INSUFFICIENT


def test_short_readme_warns(make_ctx):
    assert readme_quality(make_ctx(readme_text="too short")).status == Status.WARN


def test_no_link_warns(make_ctx):
    text = "word " * (README_MIN_WORDS + 5)
    assert readme_quality(make_ctx(readme_text=text)).status == Status.WARN


def test_good_readme_passes(make_ctx):
    text = ("word " * (README_MIN_WORDS + 5)) + " https://demo.example.com"
    assert readme_quality(make_ctx(readme_text=text)).status == Status.PASS
