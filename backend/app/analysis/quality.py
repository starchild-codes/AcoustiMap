"""
Rule-based quality-control engine.

Each flag includes: code, severity, measured value, threshold, explanation,
recommended action. The system suggests a status but does not auto-exclude.
"""

from dataclasses import dataclass
from app.models.models import FlagSeverity, QualityStatus


@dataclass
class QualityFlagData:
    flag_code: str
    severity: FlagSeverity
    measured_value: str
    threshold: str
    explanation: str
    recommended_action: str


def evaluate_quality(
    technical_features: dict,
    config: dict | None = None,
    recording_metadata: dict | None = None,
    decode_failed: bool = False,
) -> tuple[list[QualityFlagData], QualityStatus, str]:
    """
    Evaluate recording quality and return flags, suggested status, and summary.

    Returns: (flags, suggested_status, status_reason)
    """
    cfg = config or {}
    meta = recording_metadata or {}

    flags: list[QualityFlagData] = []

    if decode_failed:
        flags.append(QualityFlagData(
            flag_code="decode_failure",
            severity=FlagSeverity.fatal,
            measured_value="N/A",
            threshold="Decodable audio",
            explanation="The audio file could not be decoded.",
            recommended_action="Exclude this recording. Re-upload a valid file if available.",
        ))
        return flags, QualityStatus.excluded, "Decode failure"

    duration = technical_features.get("duration")
    peak = technical_features.get("peak_amplitude")
    rms = technical_features.get("rms_amplitude")
    clipping = technical_features.get("clipping_proportion", 0)
    silence = technical_features.get("silence_proportion", 0)
    low_freq = technical_features.get("low_freq_energy", 0)
    sample_rate = technical_features.get("processed_sample_rate")
    channel_count = technical_features.get("channel_count", 1)

    # Duration checks
    min_duration = cfg.get("min_duration", 5)
    max_duration = cfg.get("max_duration", 600)

    if duration is not None and duration < min_duration:
        flags.append(QualityFlagData(
            flag_code="too_short",
            severity=FlagSeverity.review,
            measured_value=f"{duration:.1f}s",
            threshold=f">= {min_duration}s",
            explanation="Recording is shorter than the minimum duration.",
            recommended_action="Review whether this recording is usable for analysis.",
        ))

    if duration is not None and duration > max_duration:
        flags.append(QualityFlagData(
            flag_code="too_long",
            severity=FlagSeverity.info,
            measured_value=f"{duration:.0f}s",
            threshold=f"<= {max_duration}s",
            explanation="Recording exceeds the maximum duration. It will be clipped.",
            recommended_action="No action needed; the analysis pipeline will clip to the configured duration.",
        ))

    # Near silence
    if rms is not None and rms < cfg.get("silence_threshold", 0.001):
        flags.append(QualityFlagData(
            flag_code="near_silence",
            severity=FlagSeverity.exclude_recommended,
            measured_value=f"RMS={rms:.6f}",
            threshold=f"RMS >= {cfg.get('silence_threshold', 0.001)}",
            explanation="The recording is nearly silent.",
            recommended_action="Consider excluding this recording from analysis.",
        ))

    # Excessive silence
    if silence > cfg.get("silence_proportion_threshold", 0.6):
        flags.append(QualityFlagData(
            flag_code="excessive_silence",
            severity=FlagSeverity.review,
            measured_value=f"{silence*100:.1f}%",
            threshold=f"<= {cfg.get('silence_proportion_threshold', 0.6)*100:.0f}%",
            explanation="A large proportion of the recording is silent.",
            recommended_action="Review whether the silence is expected for this habitat.",
        ))

    # Excessive clipping
    if clipping > cfg.get("clipping_threshold_percent", 0.5):
        flags.append(QualityFlagData(
            flag_code="excessive_clipping",
            severity=FlagSeverity.exclude_recommended,
            measured_value=f"{clipping*100:.2f}%",
            threshold=f"<= {cfg.get('clipping_threshold_percent', 0.5)}%",
            explanation="A significant proportion of samples are at the clipping threshold.",
            recommended_action="Consider excluding this recording. Check recorder gain settings.",
        ))

    # Low-frequency noise
    if low_freq > cfg.get("low_freq_noise_threshold", 0.7):
        flags.append(QualityFlagData(
            flag_code="low_frequency_noise",
            severity=FlagSeverity.review,
            measured_value=f"{low_freq*100:.0f}%",
            threshold=f"<= {cfg.get('low_freq_noise_threshold', 0.7)*100:.0f}%",
            explanation="A large proportion of energy is in the low-frequency band, suggesting possible noise.",
            recommended_action="Review for persistent low-frequency noise (traffic, machinery).",
        ))

    # Missing metadata
    if not meta.get("timestamp"):
        flags.append(QualityFlagData(
            flag_code="missing_timestamp",
            severity=FlagSeverity.info,
            measured_value="None",
            threshold="Required",
            explanation="Recording timestamp is missing.",
            recommended_action="Add a timestamp for proper temporal analysis.",
        ))

    if not meta.get("site_id"):
        flags.append(QualityFlagData(
            flag_code="missing_site",
            severity=FlagSeverity.info,
            measured_value="None",
            threshold="Required",
            explanation="Recording is not associated with a monitoring site.",
            recommended_action="Assign this recording to a monitoring site.",
        ))

    # Unusual sample rate
    if sample_rate is not None and sample_rate not in [8000, 16000, 22050, 32000, 44100, 48000]:
        flags.append(QualityFlagData(
            flag_code="unusual_sample_rate",
            severity=FlagSeverity.info,
            measured_value=f"{sample_rate} Hz",
            threshold="8000/16000/22050/32000/44100/48000 Hz",
            explanation="Sample rate is unusual. Audio will be resampled.",
            recommended_action="No action needed; resampling is automatic.",
        ))

    # Determine suggested status
    fatal_count = sum(1 for f in flags if f.severity == FlagSeverity.fatal)
    exclude_count = sum(1 for f in flags if f.severity == FlagSeverity.exclude_recommended)
    review_count = sum(1 for f in flags if f.severity == FlagSeverity.review)

    if fatal_count > 0:
        suggested = QualityStatus.excluded
        reason = "Fatal quality flag detected"
    elif exclude_count >= 2:
        suggested = QualityStatus.excluded
        reason = "Multiple exclude-recommended flags"
    elif exclude_count >= 1 or review_count >= 2:
        suggested = QualityStatus.review
        reason = "Quality flags require review"
    else:
        suggested = QualityStatus.good
        reason = "No significant quality issues"

    return flags, suggested, reason
