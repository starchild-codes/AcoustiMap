"""
Ecoacoustic indices calculated from real audio.

Every implementation documents the formula or library method used.
Failed calculations return None with an error message — no random values.

All indices operate on a pre-computed STFT spectrogram to avoid
recalculating the transform for each metric.
"""

import numpy as np
import librosa
from scipy.signal import hilbert
import logging

logger = logging.getLogger(__name__)


def compute_stft(audio: np.ndarray, sample_rate: int, n_fft: int = 2048,
                 hop_length: int = 512, window: str = "hann") -> np.ndarray:
    """
    Compute the magnitude STFT.

    Returns:
        Magnitude spectrogram of shape (n_freq_bins, n_time_frames).
    """
    S = np.abs(librosa.stft(audio, n_fft=n_fft, hop_length=hop_length, window=window))
    return S


def calculate_aci(
    S: np.ndarray,
    sample_rate: int,
    n_fft: int,
    hop_length: int,
    aci_freq_step_hz: float = 1000.0,
    aci_time_step_seconds: float = 5.0,
    freq_min_hz: float = 0,
    freq_max_hz: float | None = None,
) -> tuple[float | None, dict | None, str | None]:
    """
    Acoustic Complexity Index (Pieretti et al. 2011).

    ACI = sum_t sum_f |I[f,t] - I[f,t+1]| / sum_t sum_f I[f,t]

    We group frequency bins into bands of `aci_freq_step_hz` and
    time frames into groups of `aci_time_step_seconds`.

    Returns:
        (aci_value, aci_by_band_dict, error_message)
    """
    if freq_max_hz is None:
        freq_max_hz = sample_rate / 2

    if S.shape[1] < 2:
        return None, None, "ACI requires at least 2 time frames."

    bin_width = sample_rate / n_fft
    freq_bins_per_band = max(1, int(aci_freq_step_hz / bin_width))
    frames_per_time = max(1, int(aci_time_step_seconds * sample_rate / hop_length))

    # Restrict to configured frequency range
    low_bin = max(1, int(freq_min_hz / bin_width))
    high_bin = min(S.shape[0], int(freq_max_hz / bin_width))

    if high_bin <= low_bin:
        return None, None, "Empty frequency range for ACI."

    aci_total = 0.0
    aci_denominator = 0.0
    aci_by_band: dict[str, float] = {}

    band_idx = 0
    for f_start in range(low_bin, high_bin, freq_bins_per_band):
        f_end = min(f_start + freq_bins_per_band, high_bin)
        band = S[f_start:f_end, :]
        band_label = f"{int(f_start * bin_width)}_{int(f_end * bin_width)}Hz"

        band_aci = 0.0
        band_denom = 0.0

        for t_start in range(0, band.shape[1] - 1, frames_per_time):
            t_end = min(t_start + frames_per_time, band.shape[1] - 1)
            segment = band[:, t_start:t_end + 1]

            diff = np.abs(np.diff(segment, axis=1))
            sum_diff = np.sum(diff)
            sum_total = np.sum(segment[:, :-1])

            if sum_total > 0:
                band_aci += sum_diff
                band_denom += sum_total

        if band_denom > 0:
            aci_by_band[band_label] = float(band_aci / band_denom)
            aci_total += band_aci
            aci_denominator += band_denom

        band_idx += 1

    if aci_denominator == 0:
        return None, None, "ACI denominator is zero (all-silent spectrogram)."

    return float(aci_total / aci_denominator), aci_by_band, None


def calculate_biological_band_spectral_magnitude_ratio(
    S: np.ndarray,
    sample_rate: int,
    n_fft: int,
    biological_band_min_hz: float = 1000.0,
    biological_band_max_hz: float = 10000.0,
) -> tuple[float | None, str | None]:
    """
    Biological-Band Spectral Magnitude Ratio (×10).

    Sum of linear STFT magnitudes in the configured biological band divided by
    total linear STFT magnitude, scaled to a 0-10 range. This is not the
    canonical Bioacoustic Index.

    Returns:
        (bi_value, error_message)
    """
    bin_width = sample_rate / n_fft
    low_bin = max(1, int(biological_band_min_hz / bin_width))
    high_bin = min(S.shape[0], int(biological_band_max_hz / bin_width))

    if high_bin <= low_bin:
        return None, "Empty biological-band frequency range."

    bio_band = S[low_bin:high_bin, :]
    total_energy = np.sum(S)

    if total_energy == 0:
        return 0.0, None  # Silence genuinely produces zero

    bio_energy = np.sum(bio_band)
    ratio = bio_energy / total_energy
    return float(ratio * 10), None


def calculate_spectral_entropy(S: np.ndarray) -> float | None:
    """
    Spectral entropy: Shannon entropy of the normalized mean power spectrum.

    H = -sum(p * log2(p)) / log2(N)
    where p = normalized power per frequency bin.

    Returns a value in [0, 1]. None for zero-energy signals.
    """
    mean_spectrum = np.mean(S, axis=1)
    power = mean_spectrum ** 2
    total_power = np.sum(power)

    if total_power == 0:
        return None

    p = power / total_power
    p = p[p > 0]
    entropy = -np.sum(p * np.log2(p))
    max_entropy = np.log2(len(p))

    if max_entropy == 0:
        return None

    return float(entropy / max_entropy)


def calculate_temporal_entropy(audio: np.ndarray) -> float | None:
    """
    Temporal entropy: Shannon entropy of the normalized temporal envelope.

    Uses the Hilbert envelope (analytic signal magnitude).
    Returns a value in [0, 1]. None for zero-energy signals.
    """
    if len(audio) < 2:
        return None

    try:
        envelope = np.abs(hilbert(audio))
    except Exception:
        return None

    total = np.sum(envelope)
    if total == 0:
        return None

    p = envelope / total
    p = p[p > 0]
    entropy = -np.sum(p * np.log2(p))
    max_entropy = np.log2(len(p))

    if max_entropy == 0:
        return None

    return float(entropy / max_entropy)


def calculate_biological_band_occupancy(
    S: np.ndarray,
    sample_rate: int,
    n_fft: int,
    biophony_min_hz: float = 1000.0,
    biophony_max_hz: float = 10000.0,
    occupancy_relative_threshold_db: float = -40.0,
) -> tuple[float | None, dict | None, str | None]:
    """
    Biological-band acoustic occupancy.

    Method:
    1. Calculate the dB spectrogram.
    2. Restrict to the configured biological frequency range.
    3. Define an activity threshold relative to the recording's max.
    4. Mark time-frequency cells above the threshold.
    5. Calculate the occupied-cell proportion.

    NOTE: This is labelled "Biological-band acoustic occupancy" — anthropogenic
    or geophysical sounds may also occur in the selected band.

    Returns:
        (occupancy_proportion, metadata_dict, error_message)
    """
    bin_width = sample_rate / n_fft
    low_bin = max(1, int(biophony_min_hz / bin_width))
    high_bin = min(S.shape[0], int(biophony_max_hz / bin_width))

    if high_bin <= low_bin:
        return None, None, "Empty biological band for occupancy."

    band = S[low_bin:high_bin, :]

    # Convert to dB
    band_db = librosa.amplitude_to_db(band, ref=np.max)

    # Threshold relative to max
    max_db = np.max(band_db)
    threshold_db = max_db + occupancy_relative_threshold_db

    active_cells = np.sum(band_db > threshold_db)
    total_cells = band_db.size

    if total_cells == 0:
        return None, None, "No cells in biological band."

    occupancy = float(active_cells / total_cells)

    meta = {
        "threshold_db": float(threshold_db),
        "active_cells": int(active_cells),
        "total_cells": int(total_cells),
        "freq_min_hz": biophony_min_hz,
        "freq_max_hz": biophony_max_hz,
        "method": "STFT threshold relative to recording max",
        "warning": "Anthropogenic or geophysical sounds may also occur in the selected band.",
    }

    return occupancy, meta, None


def calculate_ndsi(
    S: np.ndarray,
    sample_rate: int,
    n_fft: int,
    biophony_min_hz: float = 1000.0,
    biophony_max_hz: float = 10000.0,
    anthrophony_min_hz: float = 100.0,
    anthrophony_max_hz: float = 1000.0,
) -> tuple[float | None, float | None, float | None, float | None, str | None]:
    """
    Normalized Difference Soundscape Index (Kasten et al. 2012).

    NDSI = (biophony_energy - anthrophony_energy) / (biophony_energy + anthrophony_energy)

    Also calculates:
    anthropogenic_noise_pressure = anthrophony_band_energy / total_selected_band_energy

    Returns:
        (ndsi, anthropogenic_noise_pressure, biophony_energy, anthrophony_energy, error_message)
    """
    bin_width = sample_rate / n_fft

    bio_low = max(1, int(biophony_min_hz / bin_width))
    bio_high = min(S.shape[0], int(biophony_max_hz / bin_width))
    anthro_low = max(1, int(anthrophony_min_hz / bin_width))
    anthro_high = min(S.shape[0], int(anthrophony_max_hz / bin_width))

    if bio_high <= bio_low or anthro_high <= anthro_low:
        return None, None, None, None, "Empty NDSI frequency bands."

    bio_energy = float(np.sum(S[bio_low:bio_high, :]))
    anthro_energy = float(np.sum(S[anthro_low:anthro_high, :]))
    total_selected = bio_energy + anthro_energy

    if total_selected == 0:
        return None, None, bio_energy, anthro_energy, "NDSI denominator is zero."

    ndsi = (bio_energy - anthro_energy) / total_selected
    noise_pressure = anthro_energy / total_selected

    return float(ndsi), float(noise_pressure), bio_energy, anthro_energy, None


def calculate_adi(
    S: np.ndarray,
    sample_rate: int,
    n_fft: int,
    num_bands: int = 10,
    band_width_hz: float = 1000.0,
) -> tuple[float | None, dict | None, str | None]:
    """
    Acoustic Diversity Index (Pijanowski et al. 2011).

    Shannon diversity of energy across non-overlapping frequency bands.
    Uses natural log per convention.

    Returns:
        (adi_value, metadata, error_message)
    """
    bin_width = sample_rate / n_fft
    bins_per_band = max(1, int(band_width_hz / bin_width))

    band_energies = []
    for i in range(num_bands):
        start = i * bins_per_band
        end = min((i + 1) * bins_per_band, S.shape[0])
        if start >= S.shape[0]:
            break
        band_energies.append(float(np.sum(S[start:end, :])))

    if len(band_energies) < 2:
        return None, None, "Insufficient frequency bands for ADI."

    total = sum(band_energies)
    if total == 0:
        return None, None, "Total energy is zero for ADI."

    p = np.array(band_energies) / total
    p = p[p > 0]
    entropy = -np.sum(p * np.log(p))

    meta = {
        "num_bands": len(band_energies),
        "band_width_hz": band_width_hz,
        "method": "Shannon diversity (natural log) across frequency bands",
    }

    return float(entropy), meta, None


def calculate_aei(
    S: np.ndarray,
    sample_rate: int,
    n_fft: int,
    num_bands: int = 10,
    band_width_hz: float = 1000.0,
) -> tuple[float | None, dict | None, str | None]:
    """
    Acoustic Evenness Index (Villanueva-Rivera et al. 2011).

    Gini coefficient of energy across frequency bands.

    Returns:
        (aei_value, metadata, error_message)
    """
    bin_width = sample_rate / n_fft
    bins_per_band = max(1, int(band_width_hz / bin_width))

    band_energies = []
    for i in range(num_bands):
        start = i * bins_per_band
        end = min((i + 1) * bins_per_band, S.shape[0])
        if start >= S.shape[0]:
            break
        band_energies.append(float(np.sum(S[start:end, :])))

    if len(band_energies) < 2:
        return None, None, "Insufficient frequency bands for AEI."

    values = np.sort(band_energies)
    n = len(values)
    cumulative = np.cumsum(values)

    if cumulative[-1] == 0:
        return None, None, "Total energy is zero for AEI."

    # Gini coefficient
    gini = (2 * np.sum(np.arange(1, n + 1) * values)) / (n * cumulative[-1]) - (n + 1) / n
    gini = max(0.0, float(gini))

    meta = {
        "num_bands": len(band_energies),
        "band_width_hz": band_width_hz,
        "method": "Gini coefficient across frequency bands",
    }

    return gini, meta, None


def calculate_all_ecoacoustic_features(
    S: np.ndarray,
    audio: np.ndarray,
    sample_rate: int,
    n_fft: int,
    hop_length: int,
    config: dict | None = None,
) -> dict:
    """
    Calculate all ecoacoustic features from a pre-computed spectrogram.

    This avoids recalculating the STFT for each metric.

    Returns a dict with all features. None for failed calculations.
    """
    cfg = config or {}

    features: dict = {}
    errors: list[str] = []

    # ACI
    aci, aci_bands, aci_err = calculate_aci(
        S, sample_rate, n_fft, hop_length,
        aci_freq_step_hz=cfg.get("aci_frequency_step_hz", 1000.0),
        aci_time_step_seconds=cfg.get("aci_time_step_seconds", 5.0),
        freq_min_hz=cfg.get("frequency_min_hz", 0),
        freq_max_hz=cfg.get("frequency_max_hz", sample_rate / 2),
    )
    features["aci"] = aci
    features["aci_by_band"] = aci_bands
    if aci_err:
        errors.append(f"ACI: {aci_err}")

    # Biological-Band Spectral Magnitude Ratio (×10)
    magnitude_ratio, ratio_err = calculate_biological_band_spectral_magnitude_ratio(
        S, sample_rate, n_fft,
        biological_band_min_hz=cfg.get("biological_band_min_hz", 1000.0),
        biological_band_max_hz=cfg.get("biological_band_max_hz", 10000.0),
    )
    features["biological_band_spectral_magnitude_ratio"] = magnitude_ratio
    if ratio_err:
        errors.append(f"Biological-band spectral magnitude ratio: {ratio_err}")

    # Spectral entropy
    features["spectral_entropy"] = calculate_spectral_entropy(S)

    # Temporal entropy
    features["temporal_entropy"] = calculate_temporal_entropy(audio)

    # Biological-band occupancy
    occupancy, occ_meta, occ_err = calculate_biological_band_occupancy(
        S, sample_rate, n_fft,
        biophony_min_hz=cfg.get("biophony_min_hz", 1000.0),
        biophony_max_hz=cfg.get("biophony_max_hz", 10000.0),
        occupancy_relative_threshold_db=cfg.get("occupancy_relative_threshold_db", -40.0),
    )
    features["biological_band_occupancy"] = occupancy
    if occ_err:
        errors.append(f"Occupancy: {occ_err}")

    # NDSI
    ndsi, noise_pressure, bio_energy, anthro_energy, ndsi_err = calculate_ndsi(
        S, sample_rate, n_fft,
        biophony_min_hz=cfg.get("biophony_min_hz", 1000.0),
        biophony_max_hz=cfg.get("biophony_max_hz", 10000.0),
        anthrophony_min_hz=cfg.get("anthrophony_min_hz", 100.0),
        anthrophony_max_hz=cfg.get("anthrophony_max_hz", 1000.0),
    )
    features["ndsi"] = ndsi
    features["anthropogenic_noise_pressure"] = noise_pressure
    features["biophony_energy"] = bio_energy
    features["anthrophony_energy"] = anthro_energy
    if ndsi_err:
        errors.append(f"NDSI: {ndsi_err}")

    # ADI
    adi, adi_meta, adi_err = calculate_adi(S, sample_rate, n_fft)
    features["adi"] = adi
    if adi_err:
        errors.append(f"ADI: {adi_err}")

    # AEI
    aei, aei_meta, aei_err = calculate_aei(S, sample_rate, n_fft)
    features["aei"] = aei
    if aei_err:
        errors.append(f"AEI: {aei_err}")

    features["_errors"] = errors
    return features
