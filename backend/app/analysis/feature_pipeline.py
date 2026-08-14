"""
Feature pipeline: orchestrates technical + ecoacoustic feature calculation
for a single audio segment, and quality-flag generation.
"""

import numpy as np
import librosa
import logging
from dataclasses import dataclass, field

from .quality_metrics import calculate_technical_features
from .ecoacoustic_indices import compute_stft, calculate_all_ecoacoustic_features
from .schemas import TechnicalFeatures, EcoacousticFeatures, QualityFlag, SegmentResult, SegmentInfo
from .segmentation import Segment

logger = logging.getLogger(__name__)

# Default ecological features used for modelling
DEFAULT_FEATURE_NAMES = [
    "aci", "biological_band_spectral_magnitude_ratio", "spectral_entropy", "temporal_entropy",
    "biological_band_occupancy", "ndsi", "anthropogenic_noise_pressure",
]


def evaluate_quality_flags(
    technical: dict,
    ecoacoustic_errors: list[str],
    config: dict | None = None,
    recording_metadata: dict | None = None,
    decode_failed: bool = False,
) -> list[QualityFlag]:
    """
    Rule-based quality evaluation. Returns structured flags.

    Each flag contains: code, severity, message, measured_value, threshold, recommended_action.
    """
    cfg = config or {}
    meta = recording_metadata or {}
    flags: list[QualityFlag] = []

    if decode_failed:
        flags.append(QualityFlag(
            code="DECODE_FAILED",
            severity="fatal",
            message="The audio file could not be decoded.",
            measured_value="N/A",
            threshold="Decodable audio",
            recommended_action="Exclude this recording. Re-upload a valid file if available.",
        ))
        return flags

    duration = technical.get("duration")
    rms = technical.get("rms_amplitude")
    rms_dbfs = technical.get("rms_dbfs")
    clipping_prop = technical.get("clipping_proportion", 0)
    silence_prop = technical.get("silence_proportion", 0)
    low_freq = technical.get("low_frequency_energy_proportion", 0)
    sample_rate = technical.get("processed_sample_rate")
    n = len(technical) if technical else 0

    # EMPTY_AUDIO
    if duration is not None and duration == 0:
        flags.append(QualityFlag(
            code="EMPTY_AUDIO",
            severity="fatal",
            message="Recording contains zero samples.",
            measured_value="0 samples",
            threshold="> 0 samples",
            recommended_action="Exclude this recording.",
        ))

    # TOO_SHORT
    min_duration = cfg.get("minimum_valid_duration_seconds", 5.0)
    if duration is not None and duration < min_duration:
        flags.append(QualityFlag(
            code="TOO_SHORT",
            severity="review",
            message=f"Recording is {duration:.1f}s, below the minimum of {min_duration}s.",
            measured_value=f"{duration:.1f}s",
            threshold=f">= {min_duration}s",
            recommended_action="Review whether this recording is usable.",
        ))

    # NEAR_SILENCE
    silence_threshold_dbfs = cfg.get("silence_rms_threshold_dbfs", -50.0)
    if rms_dbfs is not None and rms_dbfs < silence_threshold_dbfs:
        flags.append(QualityFlag(
            code="NEAR_SILENCE",
            severity="exclude_recommended",
            message=f"RMS level ({rms_dbfs:.1f} dBFS) is below the silence threshold ({silence_threshold_dbfs} dBFS).",
            measured_value=f"{rms_dbfs:.1f} dBFS",
            threshold=f">= {silence_threshold_dbfs} dBFS",
            recommended_action="Consider excluding this recording.",
        ))

    # HIGH_SILENCE_PROPORTION
    silence_warn = cfg.get("silence_proportion_warning", 0.50)
    if silence_prop > silence_warn:
        flags.append(QualityFlag(
            code="HIGH_SILENCE_PROPORTION",
            severity="review",
            message=f"Silence proportion ({silence_prop*100:.1f}%) exceeds warning threshold ({silence_warn*100:.0f}%).",
            measured_value=f"{silence_prop*100:.1f}%",
            threshold=f"<= {silence_warn*100:.0f}%",
            recommended_action="Review whether the silence is expected for this habitat.",
        ))

    # EXCESSIVE_CLIPPING
    clipping_warn = cfg.get("clipping_proportion_warning", 0.001)
    if clipping_prop > clipping_warn:
        flags.append(QualityFlag(
            code="EXCESSIVE_CLIPPING",
            severity="exclude_recommended",
            message=f"Clipping proportion ({clipping_prop*100:.2f}%) exceeds threshold ({clipping_warn*100:.2f}%).",
            measured_value=f"{clipping_prop*100:.2f}%",
            threshold=f"<= {clipping_warn*100:.2f}%",
            recommended_action="Consider excluding. Check recorder gain settings.",
        ))

    # LOW_FREQUENCY_DOMINANCE
    low_freq_warn = cfg.get("low_frequency_noise_warning", 0.65)
    if low_freq > low_freq_warn:
        flags.append(QualityFlag(
            code="LOW_FREQUENCY_DOMINANCE",
            severity="review",
            message=f"Low-frequency energy ({low_freq*100:.0f}%) exceeds warning threshold ({low_freq_warn*100:.0f}%).",
            measured_value=f"{low_freq*100:.0f}%",
            threshold=f"<= {low_freq_warn*100:.0f}%",
            recommended_action="Review for persistent low-frequency noise.",
        ))

    # UNUSUAL_SAMPLE_RATE
    if sample_rate is not None and sample_rate not in [8000, 16000, 22050, 32000, 44100, 48000]:
        flags.append(QualityFlag(
            code="UNUSUAL_SAMPLE_RATE",
            severity="info",
            message=f"Sample rate ({sample_rate} Hz) is unusual.",
            measured_value=f"{sample_rate} Hz",
            threshold="8000/16000/22050/32000/44100/48000 Hz",
            recommended_action="No action needed; resampling is automatic.",
        ))

    # MISSING_TIMESTAMP
    if not meta.get("timestamp"):
        flags.append(QualityFlag(
            code="MISSING_TIMESTAMP",
            severity="info",
            message="Recording timestamp is missing.",
            measured_value="None",
            threshold="Required",
            recommended_action="Add a timestamp for temporal analysis.",
        ))

    # MISSING_SITE
    if not meta.get("site_id"):
        flags.append(QualityFlag(
            code="MISSING_SITE",
            severity="info",
            message="Recording is not associated with a monitoring site.",
            measured_value="None",
            threshold="Required",
            recommended_action="Assign this recording to a monitoring site.",
        ))

    # ECOACOUSTIC_METRIC_FAILED
    if ecoacoustic_errors:
        flags.append(QualityFlag(
            code="ECOACOUSTIC_METRIC_FAILED",
            severity="review",
            message=f"One or more ecoacoustic metrics failed: {'; '.join(ecoacoustic_errors[:3])}",
            measured_value=f"{len(ecoacoustic_errors)} failures",
            threshold="0 failures",
            recommended_action="Review the analysis log for details.",
        ))

    return flags


def suggest_quality_status(flags: list[QualityFlag]) -> tuple[str, str]:
    """
    Determine suggested quality status from flags.

    Returns: (status, reason)
    Status: "valid", "review", "exclude_recommended", "failed"
    """
    fatal = [f for f in flags if f.severity == "fatal"]
    exclude = [f for f in flags if f.severity == "exclude_recommended"]
    review = [f for f in flags if f.severity == "review"]

    if fatal:
        return "failed", "Fatal quality flag detected"
    if len(exclude) >= 2:
        return "exclude_recommended", "Multiple exclude-recommended flags"
    if len(exclude) >= 1 or len(review) >= 1:
        return "review", "Quality flags require review"
    return "valid", "No significant quality issues"


def process_segment(
    segment: Segment,
    sample_rate: int,
    config: dict | None = None,
) -> SegmentResult:
    """
    Process a single segment: calculate technical + ecoacoustic features and quality flags.
    """
    cfg = config or {}
    n_fft = cfg.get("n_fft", 2048)
    hop_length = cfg.get("hop_length", 512)
    window = cfg.get("window", "hann")

    audio = segment.samples
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1).astype(np.float32)

    # Technical features
    tech_dict = calculate_technical_features(audio, sample_rate, cfg)
    technical = TechnicalFeatures(**tech_dict)

    # Ecoacoustic features from shared STFT
    eco_dict: dict = {}
    eco_errors: list[str] = []
    try:
        S = compute_stft(audio, sample_rate, n_fft, hop_length, window)
        eco_dict = calculate_all_ecoacoustic_features(S, audio, sample_rate, n_fft, hop_length, cfg)
        eco_errors = eco_dict.pop("_errors", [])
    except Exception as e:
        logger.error("Ecoacoustic feature calculation failed for segment %s: %s", segment.segment_id, e)
        eco_errors.append(str(e))

    # Build EcoacousticFeatures, filtering out non-schema keys
    eco_schema_keys = {
        "aci", "aci_by_band", "biological_band_spectral_magnitude_ratio", "spectral_entropy", "temporal_entropy",
        "biological_band_occupancy", "ndsi", "anthropogenic_noise_pressure",
        "biophony_energy", "anthrophony_energy", "adi", "aei",
    }
    eco_filtered = {k: v for k, v in eco_dict.items() if k in eco_schema_keys}
    ecoacoustic = EcoacousticFeatures(**eco_filtered)

    # Quality flags
    flags = evaluate_quality_flags(tech_dict, eco_errors, cfg)

    seg_info = SegmentInfo(
        segment_id=segment.segment_id,
        index=segment.index,
        start_time=segment.start_time,
        end_time=segment.end_time,
        duration=segment.duration,
        sample_count=segment.sample_count,
        is_valid=segment.is_valid,
        exclusion_reason=segment.exclusion_reason,
    )

    return SegmentResult(
        segment_id=segment.segment_id,
        segment_info=seg_info,
        technical=technical,
        ecoacoustic=ecoacoustic,
        quality_flags=flags,
        errors=eco_errors,
    )
