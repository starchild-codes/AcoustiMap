"""
Validated analysis configuration using Pydantic.

The exact configuration used is stored with every analysis run for reproducibility.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Literal


class AnalysisConfig(BaseModel):
    """Complete configuration for an analysis run."""

    # Audio loading
    target_sample_rate: int = Field(default=22050, ge=1)
    channel_mode: str = "mono"

    # Segmentation
    segment_duration_seconds: float = Field(default=30.0, gt=0)
    segment_overlap_seconds: float = Field(default=0.0, ge=0)
    minimum_valid_duration_seconds: float = Field(default=5.0, gt=0)

    # Frequency range
    frequency_min_hz: float = Field(default=100.0, ge=0)
    frequency_max_hz: float = Field(default=10000.0, gt=0)

    # STFT
    n_fft: int = Field(default=2048, ge=256)
    hop_length: int = Field(default=512, ge=1)
    window: str = "hann"

    # Preprocessing
    amplitude_normalization: str = "none"
    remove_dc_offset: bool = True

    # Quality thresholds
    silence_rms_threshold_dbfs: float = -50.0
    clipping_amplitude_threshold: float = Field(default=0.99, gt=0, lt=1.0)
    clipping_proportion_warning: float = Field(default=0.001, ge=0, le=1)
    silence_proportion_warning: float = Field(default=0.50, ge=0, le=1)
    low_frequency_cutoff_hz: float = Field(default=300.0, ge=0)
    low_frequency_noise_warning: float = Field(default=0.65, ge=0, le=1)

    # ACI parameters
    aci_frequency_step_hz: float = Field(default=1000.0, gt=0)
    aci_time_step_seconds: float = Field(default=5.0, gt=0)

    # BI parameters
    bi_min_hz: float = Field(default=1000.0, ge=0)
    bi_max_hz: float = Field(default=10000.0, gt=0)

    # NDSI / noise proxy bands
    biophony_min_hz: float = Field(default=1000.0, ge=0)
    biophony_max_hz: float = Field(default=10000.0, gt=0)
    anthrophony_min_hz: float = Field(default=100.0, ge=0)
    anthrophony_max_hz: float = Field(default=1000.0, gt=0)

    # Occupancy
    occupancy_relative_threshold_db: float = -40.0

    # Reference model
    reference_scaling: str = "robust"
    distance_metric: str = "euclidean"
    minimum_recordings_per_reference_group: int = Field(default=3, ge=1)
    minimum_segments_per_recording: int = Field(default=1, ge=1)

    # Bootstrap
    bootstrap_iterations: int = Field(default=500, ge=0)
    random_seed: int = Field(default=42, ge=0)

    # Metadata
    software_version: str = "1.0.0"

    @model_validator(mode="after")
    def validate_config(self):
        # Segment overlap must be smaller than segment duration
        if self.segment_overlap_seconds >= self.segment_duration_seconds:
            raise ValueError(
                f"segment_overlap_seconds ({self.segment_overlap_seconds}) must be smaller than "
                f"segment_duration_seconds ({self.segment_duration_seconds})"
            )

        # Frequency max below Nyquist after resampling
        nyquist = self.target_sample_rate / 2
        if self.frequency_max_hz > nyquist:
            raise ValueError(
                f"frequency_max_hz ({self.frequency_max_hz}) exceeds Nyquist frequency "
                f"({nyquist} Hz) for sample rate {self.target_sample_rate} Hz"
            )

        # Lower frequencies below upper frequencies
        if self.frequency_min_hz >= self.frequency_max_hz:
            raise ValueError(
                f"frequency_min_hz ({self.frequency_min_hz}) must be below "
                f"frequency_max_hz ({self.frequency_max_hz})"
            )

        if self.bi_min_hz >= self.bi_max_hz:
            raise ValueError(f"bi_min_hz ({self.bi_min_hz}) must be below bi_max_hz ({self.bi_max_hz})")

        if self.biophony_min_hz >= self.biophony_max_hz:
            raise ValueError(
                f"biophony_min_hz ({self.biophony_min_hz}) must be below "
                f"biophony_max_hz ({self.biophony_max_hz})"
            )

        if self.anthrophony_min_hz >= self.anthrophony_max_hz:
            raise ValueError(
                f"anthrophony_min_hz ({self.anthrophony_min_hz}) must be below "
                f"anthrophony_max_hz ({self.anthrophony_max_hz})"
            )

        # Valid normalisation
        if self.amplitude_normalization not in ("none", "peak", "rms"):
            raise ValueError(f"Invalid amplitude_normalization: {self.amplitude_normalization}")

        # Valid scaling
        if self.reference_scaling not in ("none", "standard", "robust"):
            raise ValueError(f"Invalid reference_scaling: {self.reference_scaling}")

        # Valid distance metric
        if self.distance_metric not in ("euclidean", "cosine"):
            raise ValueError(f"Invalid distance_metric: {self.distance_metric}")

        # FFT size should be power of 2 for efficiency
        if self.n_fft & (self.n_fft - 1) != 0:
            import warnings
            warnings.warn(f"n_fft ({self.n_fft}) is not a power of 2; this may be inefficient.")

        # Hop length should not exceed FFT size
        if self.hop_length > self.n_fft:
            raise ValueError(f"hop_length ({self.hop_length}) cannot exceed n_fft ({self.n_fft})")

        # Channel mode
        if self.channel_mode not in ("mono", "stereo"):
            raise ValueError(f"Invalid channel_mode: {self.channel_mode}")

        return self

    def to_dict(self) -> dict:
        """Return a serialisable dictionary of the configuration."""
        return self.model_dump()
