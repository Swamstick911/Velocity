"""Signal registry. The runner will just iterate the SIGNALS, so adding
a new check later = write the function and append it here"""

from engine.signals.eligibility import birth_year_eligibility
from engine.signals.reachability import playable_reachable
from engine.signals.readme import readme_quality
from engine.signals.ai_slop import (
    ai_single_commit_dump,
    ai_low_cadence_for_size,
    ai_commit_burst,
    ai_generic_readme,
)
from engine.signals.double_dip import (
    dd_normalized_url_match,
    dd_root_commit_match,
    dd_hackatime_project_match,
)
from engine.signals.hour_inflation import (
    hours_vs_code_inflation,
    hackatime_project_mismatch,
)

#Every signal is a function: (ctx: SubmissionContext) -> SignalResult
SIGNALS = [
    #definitive/eligibility
    birth_year_eligibility,
    playable_reachable,
    readme_quality,
    #AI/low effort slop
    ai_single_commit_dump,
    ai_low_cadence_for_size,
    ai_commit_burst,
    ai_generic_readme,
    #double-dip/reship
    dd_normalized_url_match,
    dd_root_commit_match,
    dd_hackatime_project_match,
    #fake demo/hour inflation
    hours_vs_code_inflation,
    hackatime_project_mismatch,
]