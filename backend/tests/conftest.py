"""Shared test setup: make `engine` importable and provide a context factory."""

import os
import sys

# Put backend/ on the path so `import engine...` works no matter how pytest is run.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest

from engine.types import SubmissionContext


def _make_ctx(**overrides) -> SubmissionContext:
    """A SubmissionContext with sane defaults; tests override only what they need."""
    defaults = dict(
        github_url="https://github.com/octo/widget",
        playable_url="https://widget.example.com",
        target_program="TestProgram",
        owner="octo",
        repo="widget",
    )
    defaults.update(overrides)
    return SubmissionContext(**defaults)


@pytest.fixture
def make_ctx():
    return _make_ctx
