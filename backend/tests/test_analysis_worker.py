"""Regression tests for persisted-to-executable worker configuration."""

from types import SimpleNamespace

from app.workers.analysis_worker import build_pipeline_config


def test_bootstrap_iterations_are_honoured_exactly():
    persisted = SimpleNamespace(
        target_sample_rate=22050,
        target_channel_mode="mono",
        clip_duration=30.0,
        freq_min=100.0,
        freq_max=10000.0,
        fft_size=2048,
        hop_length=512,
        normalisation_method="none",
        clipping_threshold=0.99,
        low_freq_noise_threshold=0.65,
        aci_freq_step=1000.0,
        aci_time_step=5.0,
        biological_band_min_hz=1000.0,
        biological_band_max_hz=10000.0,
        similarity_scaling_method="robust",
        bootstrap_iterations=347,
        temporal_bootstrap_iterations=123,
        temporal_stable_threshold_per_year=1.0,
        temporal_strong_threshold_per_year=5.0,
        random_seed=17,
        software_version="1.0.0",
    )
    executable = build_pipeline_config(persisted)
    assert executable.bootstrap_iterations == 347
    assert executable.temporal_bootstrap_iterations == 123
    assert executable.random_seed == 17
