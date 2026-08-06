"""
Recording segmentation into fixed-duration segments.

Segment ID format: {recording_id}__seg_{index:04d}
"""

import numpy as np
from dataclasses import dataclass
from typing import Literal


@dataclass
class Segment:
    """A single segment of a recording."""
    segment_id: str
    index: int
    start_time: float
    end_time: float
    duration: float
    samples: np.ndarray
    sample_count: int
    is_valid: bool = True
    exclusion_reason: str | None = None


def segment_audio(
    audio: np.ndarray,
    sample_rate: int,
    recording_id: str,
    segment_duration_seconds: float = 30.0,
    segment_overlap_seconds: float = 0.0,
    minimum_valid_duration_seconds: float = 5.0,
) -> list[Segment]:
    """
    Divide audio into fixed-duration segments with optional overlap.

    Args:
        audio: 1D or 2D array of audio samples.
        sample_rate: Sample rate in Hz.
        recording_id: ID of the parent recording.
        segment_duration_seconds: Duration of each segment.
        segment_overlap_seconds: Overlap between consecutive segments.
        minimum_valid_duration_seconds: Segments shorter than this are excluded.

    Returns:
        List of Segment objects.
    """
    total_samples = audio.shape[0]
    segment_samples = int(segment_duration_seconds * sample_rate)
    hop_samples = int((segment_duration_seconds - segment_overlap_seconds) * sample_rate)

    if hop_samples <= 0:
        hop_samples = segment_samples

    segments: list[Segment] = []
    index = 0
    pos = 0

    while pos < total_samples:
        end = min(pos + segment_samples, total_samples)
        seg_audio = audio[pos:end]
        seg_duration = seg_audio.shape[0] / sample_rate
        seg_id = f"{recording_id}__seg_{index:04d}"

        is_valid = True
        exclusion_reason = None

        if seg_duration < minimum_valid_duration_seconds:
            is_valid = False
            exclusion_reason = f"Segment duration ({seg_duration:.1f}s) below minimum ({minimum_valid_duration_seconds}s)"

        segments.append(Segment(
            segment_id=seg_id,
            index=index,
            start_time=pos / sample_rate,
            end_time=end / sample_rate,
            duration=seg_duration,
            samples=seg_audio,
            sample_count=seg_audio.shape[0],
            is_valid=is_valid,
            exclusion_reason=exclusion_reason,
        ))

        index += 1
        pos += hop_samples

    # If the recording is shorter than the segment duration but longer than minimum,
    # analyse it as one segment with a warning.
    if len(segments) == 0 and total_samples > 0:
        seg_duration = total_samples / sample_rate
        if seg_duration >= minimum_valid_duration_seconds:
            seg_id = f"{recording_id}__seg_{index:04d}"
            segments.append(Segment(
                segment_id=seg_id,
                index=0,
                start_time=0.0,
                end_time=seg_duration,
                duration=seg_duration,
                samples=audio,
                sample_count=total_samples,
                is_valid=True,
                exclusion_reason=None,
            ))

    return segments


def segment_to_dict(seg: Segment) -> dict:
    """Convert a Segment to a serialisable dict (without samples)."""
    return {
        "segment_id": seg.segment_id,
        "index": seg.index,
        "start_time": seg.start_time,
        "end_time": seg.end_time,
        "duration": seg.duration,
        "sample_count": seg.sample_count,
        "is_valid": seg.is_valid,
        "exclusion_reason": seg.exclusion_reason,
    }
