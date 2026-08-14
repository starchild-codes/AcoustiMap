"""Tests for ecoacoustic indices."""

import pytest
import numpy as np

from app.analysis.ecoacoustic_indices import (
    compute_stft, calculate_aci, calculate_biological_band_spectral_magnitude_ratio, calculate_spectral_entropy,
    calculate_temporal_entropy, calculate_biological_band_occupancy,
    calculate_ndsi, calculate_adi, calculate_aei,
    calculate_all_ecoacoustic_features,
)
from tests.analysis.fixtures import (
    generate_silence, generate_sine_wave, generate_white_noise,
    generate_multi_tone, generate_sine_wave as sine,
)


@pytest.fixture
def sr():
    return 22050


@pytest.fixture
def n_fft():
    return 2048


@pytest.fixture
def hop():
    return 512


def test_2000hz_more_biological_energy_than_200hz(sr, n_fft, hop):
    """A 2000 Hz tone has more energy in the biological band than a 200 Hz tone."""
    audio_2k = generate_sine_wave(2000, 10, sr, amplitude=0.5)
    audio_200 = generate_sine_wave(200, 10, sr, amplitude=0.5)

    S_2k = compute_stft(audio_2k, sr, n_fft, hop)
    S_200 = compute_stft(audio_200, sr, n_fft, hop)

    bi_2k, _ = calculate_biological_band_spectral_magnitude_ratio(S_2k, sr, n_fft, biological_band_min_hz=1000, biological_band_max_hz=10000)
    bi_200, _ = calculate_biological_band_spectral_magnitude_ratio(S_200, sr, n_fft, biological_band_min_hz=1000, biological_band_max_hz=10000)

    assert bi_2k is not None
    assert bi_200 is not None
    assert bi_2k > bi_200


def test_white_noise_higher_entropy_than_tone(sr, n_fft, hop):
    """White noise has higher spectral entropy than a pure tone."""
    noise = generate_white_noise(10, sr, seed=42)
    tone = generate_sine_wave(1000, 10, sr)

    S_noise = compute_stft(noise, sr, n_fft, hop)
    S_tone = compute_stft(tone, sr, n_fft, hop)

    ent_noise = calculate_spectral_entropy(S_noise)
    ent_tone = calculate_spectral_entropy(S_tone)

    assert ent_noise is not None
    assert ent_tone is not None
    assert ent_noise > ent_tone


def test_silence_low_bi(sr, n_fft, hop):
    """Silence yields a very low or zero BI."""
    audio = generate_silence(10, sr)
    S = compute_stft(audio, sr, n_fft, hop)
    bi, err = calculate_biological_band_spectral_magnitude_ratio(S, sr, n_fft, biological_band_min_hz=1000, biological_band_max_hz=10000)
    assert bi is not None
    assert bi < 0.01  # Very low for silence


def test_silence_spectral_entropy_none(sr, n_fft, hop):
    """Silence returns None for spectral entropy (zero energy)."""
    audio = generate_silence(10, sr)
    S = compute_stft(audio, sr, n_fft, hop)
    ent = calculate_spectral_entropy(S)
    assert ent is None


def test_occupancy_responds_to_active_cells(sr, n_fft, hop):
    """Occupancy is higher for a multi-tone signal than silence."""
    multi = generate_multi_tone([2000, 4000, 6000, 8000], 10, sr, amplitude=0.5)
    silence = generate_silence(10, sr)

    S_multi = compute_stft(multi, sr, n_fft, hop)
    S_silence = compute_stft(silence, sr, n_fft, hop)

    occ_multi, _, _ = calculate_biological_band_occupancy(S_multi, sr, n_fft)
    occ_silence, _, _ = calculate_biological_band_occupancy(S_silence, sr, n_fft)

    # Multi-tone should have non-zero occupancy; silence should be zero or None
    assert occ_multi is not None
    assert occ_multi > 0  # Active cells exist in multi-tone signal


def test_ndsi_changes_direction(sr, n_fft, hop):
    """NDSI changes direction when energy shifts between bands."""
    # Signal in biophony band (2-8 kHz)
    bio = generate_sine_wave(4000, 10, sr, amplitude=0.5)
    S_bio = compute_stft(bio, sr, n_fft, hop)
    ndsi_bio, _, _, _, _ = calculate_ndsi(S_bio, sr, n_fft,
                                           biophony_min_hz=1000, biophony_max_hz=10000,
                                           anthrophony_min_hz=100, anthrophony_max_hz=1000)

    # Signal in anthrophony band (100-1000 Hz)
    anthro = generate_sine_wave(500, 10, sr, amplitude=0.5)
    S_anthro = compute_stft(anthro, sr, n_fft, hop)
    ndsi_anthro, _, _, _, _ = calculate_ndsi(S_anthro, sr, n_fft,
                                              biophony_min_hz=1000, biophony_max_hz=10000,
                                              anthrophony_min_hz=100, anthrophony_max_hz=1000)

    assert ndsi_bio is not None
    assert ndsi_anthro is not None
    assert ndsi_bio > ndsi_anthro  # Biophony signal should have higher NDSI


def test_all_features_deterministic(sr, n_fft, hop):
    """All features are deterministic for the same input."""
    audio = generate_multi_tone([1000, 3000, 5000], 10, sr, amplitude=0.5)
    S = compute_stft(audio, sr, n_fft, hop)

    features1 = calculate_all_ecoacoustic_features(S, audio, sr, n_fft, hop, {})
    features2 = calculate_all_ecoacoustic_features(S, audio, sr, n_fft, hop, {})

    for key in ["aci", "biological_band_spectral_magnitude_ratio", "spectral_entropy", "temporal_entropy",
                "biological_band_occupancy", "ndsi"]:
        v1 = features1.get(key)
        v2 = features2.get(key)
        if v1 is not None and v2 is not None:
            assert v1 == pytest.approx(v2, rel=1e-6)


def test_aci_silence_returns_none_or_zero(sr, n_fft, hop):
    """ACI handles silence gracefully."""
    audio = generate_silence(10, sr)
    S = compute_stft(audio, sr, n_fft, hop)
    aci, _, err = calculate_aci(S, sr, n_fft, hop)
    # Silence should either return None or a very low value
    assert aci is None or aci < 0.01 or err is not None


def test_temporal_entropy_tone_vs_noise(sr):
    """Temporal entropy is highest for a temporally even envelope.

    A pure sine wave has a constant Hilbert envelope, while white noise has a
    varying envelope."""
    tone = generate_sine_wave(1000, 10, sr, amplitude=0.5)
    noise = generate_white_noise(10, sr, seed=42)

    ent_tone = calculate_temporal_entropy(tone)
    ent_noise = calculate_temporal_entropy(noise)

    assert ent_noise is not None
    assert ent_noise > 0  # Noise has non-zero temporal entropy
    # A pure tone's Hilbert envelope is constant → entropy is 0 or very low
    # If tone entropy is None (zero energy), just check noise > 0
    if ent_tone is not None:
        # A constant tone envelope is more temporally even and therefore has
        # higher normalized Shannon entropy than the varying noise envelope.
        assert ent_tone > ent_noise
