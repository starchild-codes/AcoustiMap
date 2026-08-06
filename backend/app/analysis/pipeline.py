"""
Real audio analysis pipeline using NumPy, SciPy, and Librosa.

Every metric implementation documents the formula or library method used.
Returns null for failed calculations rather than inventing results.
"""

import numpy as np
import librosa
from scipy import signal
from dataclasses import dataclass, field
from typing import Any

import logging
logger = logging.getLogger(__name__)


@dataclass
class TechnicalFeatures:
    """Browser/Python-calculated technical features."""
    duration: float | None = None
    original_sample_rate: int | None = None
    processed_sample_rate: int | None = None
    channel_count: int | None = None
    peak_amplitude: float | None = None
    rms_amplitude: float | None = None
    dynamic_range_db: float | None = None
    clipping_proportion: float | None = None
    silence_proportion: float | None = None
    zero_crossing_rate: float | None = None
    low_freq_energy: float | None = None
    mid_freq_energy: float | None = None
    high_freq_energy: float | None = None
    spectral_centroid: float | None = None
    spectral_bandwidth: float | None = None
    spectral_rolloff: float | None = None


@dataclass
class EcoacousticFeatures:
    """Ecoacoustic indices calculated from audio."""
    aci: float | None = None
    bi: float | None = None
    spectral_entropy: float | None = None
    temporal_entropy: float | None = None
    frequency_band_occupancy: float | None = None
    acoustic_diversity_index: float | None = None
    acoustic_evenness_index: float | None = None
    ndsi: float | None = None


@dataclass
class AnalysisResult:
    technical: TechnicalFeatures
    ecoacoustic: EcoacousticFeatures
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    runtime_seconds: float = 0.0


def load_and_standardize(
    file_path: str,
    target_sr: int = 22050,
    mono: bool = True,
    clip_duration: float | None = None,
    start_offset: float = 0.0,
    normalisation: str = "none",
) -> tuple[np.ndarray | None, int | None, int | None, list[str]]:
    """
    Load audio file, convert to mono if requested, resample to target_sr,
    optionally clip to a fixed duration starting at start_offset.
    Returns (audio_data, target_sr, original_sr, errors).
    """
    errors: list[str] = []

    try:
        y, orig_sr = librosa.load(file_path, sr=target_sr, mono=mono, offset=start_offset,
                                  duration=clip_duration)
    except Exception as e:
        logger.error("Audio decode failed for %s: %s", file_path, e)
        return None, None, None, [f"Decode failure: {e}"]

    # NaN / infinity checks
    if np.any(np.isnan(y)) or np.any(np.isinf(y)):
        y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)
        errors.append("NaN or infinity values found in audio; replaced with zero.")

    # Normalisation
    if normalisation == "peak":
        peak = np.max(np.abs(y))
        if peak > 0:
            y = y / peak
    elif normalisation == "rms":
        rms = np.sqrt(np.mean(y ** 2))
        if rms > 0:
            y = y / rms

    return y, target_sr, orig_sr, errors


def calculate_technical_features(
    y: np.ndarray,
    sr: int,
    original_sr: int | None,
    channel_count: int = 1,
    config: dict | None = None,
) -> TechnicalFeatures:
    """
    Calculate technical quality features from decoded audio.

    All formulas use standard digital signal processing definitions:
    - RMS: sqrt(mean(x^2))
    - Peak: max(|x|)
    - Dynamic range: 20*log10(peak / (rms + epsilon))
    - Zero-crossing rate: count of sign changes / (N-1)
    """
    cfg = config or {}
    silence_threshold = cfg.get("silence_threshold", 0.001)
    clipping_threshold = cfg.get("clipping_threshold", 0.99)

    n = len(y)
    if n == 0:
        return TechnicalFeatures(errors=["Empty audio buffer"])

    duration = n / sr
    abs_y = np.abs(y)
    peak = float(np.max(abs_y)) if n > 0 else 0.0
    rms = float(np.sqrt(np.mean(y ** 2))) if n > 0 else 0.0
    dynamic_range = 20 * np.log10(peak / (rms + 1e-10)) if peak > 0 and rms > 0 else 0.0

    # Clipping: proportion of samples at or above threshold
    clipping_count = int(np.sum(abs_y >= clipping_threshold))
    clipping_prop = clipping_count / n if n > 0 else 0.0

    # Silence: proportion of samples below threshold
    silence_count = int(np.sum(abs_y < silence_threshold))
    silence_prop = silence_count / n if n > 0 else 0.0

    # Zero-crossing rate
    if n > 1:
        sign_changes = np.sum(np.diff(np.signbit(y)))
        zcr = float(sign_changes / (n - 1))
    else:
        zcr = 0.0

    # Frequency band energy using FFT
    low_freq, mid_freq, high_freq = _compute_frequency_bands(y, sr)

    # Spectral features using librosa
    spectral_centroid = None
    spectral_bandwidth = None
    spectral_rolloff = None

    try:
        spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    except Exception:
        pass

    try:
        spectral_bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)))
    except Exception:
        pass

    try:
        spectral_rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
    except Exception:
        pass

    return TechnicalFeatures(
        duration=duration,
        original_sample_rate=original_sr,
        processed_sample_rate=sr,
        channel_count=channel_count,
        peak_amplitude=peak,
        rms_amplitude=rms,
        dynamic_range_db=dynamic_range,
        clipping_proportion=clipping_prop,
        silence_proportion=silence_prop,
        zero_crossing_rate=zcr,
        low_freq_energy=low_freq,
        mid_freq_energy=mid_freq,
        high_freq_energy=high_freq,
        spectral_centroid=spectral_centroid,
        spectral_bandwidth=spectral_bandwidth,
        spectral_rolloff=spectral_rolloff,
    )


def _compute_frequency_bands(y: np.ndarray, sr: int) -> tuple[float, float, float]:
    """Compute low/mid/high frequency energy proportions using FFT."""
    n = len(y)
    if n == 0:
        return 0.0, 0.0, 0.0

    # Use a single FFT of the entire signal for energy distribution
    fft_size = min(4096, n)
    frame = y[:fft_size]
    windowed = frame * np.hanning(fft_size)
    spectrum = np.abs(np.fft.rfft(windowed))

    bin_width = sr / fft_size
    low_cutoff = 500  # Hz
    mid_cutoff = 4000  # Hz

    low_bin = int(low_cutoff / bin_width)
    mid_bin = int(mid_cutoff / bin_width)

    low_energy = float(np.sum(spectrum[1:low_bin] ** 2)) if low_bin > 1 else 0.0
    mid_energy = float(np.sum(spectrum[low_bin:mid_bin] ** 2)) if mid_bin > low_bin else 0.0
    high_energy = float(np.sum(spectrum[mid_bin:] ** 2)) if len(spectrum) > mid_bin else 0.0

    total = low_energy + mid_energy + high_energy
    if total == 0:
        return 0.0, 0.0, 0.0

    return (low_energy / total, mid_energy / total, high_energy / total)


def calculate_ecoacoustic_features(
    y: np.ndarray,
    sr: int,
    config: dict | None = None,
) -> tuple[EcoacousticFeatures, list[str]]:
    """
    Calculate ecoacoustic indices.

    ACI (Acoustic Complexity Index):
        Following Pieretti et al. (2011). ACI = sum over time steps of
        sum(|I[i,t] - I[i,t+1]|) / sum(I[i,t] + I[i,t+1])
        across frequency bins.

    BI (Bioacoustic Index):
        Following Boelman et al. (2007). Sum of energy in the 2-8 kHz band
        normalized by total energy, expressed as a ratio.

    Spectral entropy:
        Shannon entropy of the normalized power spectrum, averaged over time.

    Temporal entropy:
        Shannon entropy of the normalized temporal envelope.

    Frequency-band occupancy:
        Proportion of frequency bins whose energy exceeds a threshold.

    ADI (Acoustic Diversity Index):
        Following Pijanowski et al. (2011). Shannon entropy of energy across
        non-overlapping frequency bands.

    AEI (Acoustic Evenness Index):
        Following Villanueva-Rivera et al. (2011). Gini coefficient of energy
        across frequency bands.

    NDSI (Normalized Difference Soundscape Index):
        Following Kasten et al. (2012). (bio - anthro) / (bio + anthro) where
        bio = 2-8 kHz band and anthro = 0-1 kHz band.
    """
    cfg = config or {}
    errors: list[str] = []

    fft_size = cfg.get("fft_size", 2048)
    hop_length = cfg.get("hop_length", 512)
    aci_freq_step = cfg.get("aci_freq_step", 1000.0)
    aci_time_step = cfg.get("aci_time_step", 1.0)
    bi_freq_min = cfg.get("bi_freq_min", 2000.0)
    bi_freq_max = cfg.get("bi_freq_max", 8000.0)
    freq_min = cfg.get("freq_min", 0.0)
    freq_max = cfg.get("freq_max", sr / 2)

    result = EcoacousticFeatures()

    # Compute STFT
    try:
        S = np.abs(librosa.stft(y, n_fft=fft_size, hop_length=hop_length))
    except Exception as e:
        errors.append(f"STFT computation failed: {e}")
        return result, errors

    # ACI
    try:
        result.aci = _calculate_aci(S, sr, fft_size, hop_length, aci_freq_step, aci_time_step)
    except Exception as e:
        errors.append(f"ACI calculation failed: {e}")

    # BI
    try:
        result.bi = _calculate_bi(S, sr, fft_size, bi_freq_min, bi_freq_max)
    except Exception as e:
        errors.append(f"BI calculation failed: {e}")

    # Spectral entropy
    try:
        result.spectral_entropy = _calculate_spectral_entropy(S)
    except Exception as e:
        errors.append(f"Spectral entropy calculation failed: {e}")

    # Temporal entropy
    try:
        result.temporal_entropy = _calculate_temporal_entropy(y)
    except Exception as e:
        errors.append(f"Temporal entropy calculation failed: {e}")

    # Frequency-band occupancy
    try:
        result.frequency_band_occupancy = _calculate_frequency_occupancy(S, sr, fft_size, freq_min, freq_max)
    except Exception as e:
        errors.append(f"Frequency occupancy calculation failed: {e}")

    # ADI
    try:
        result.acoustic_diversity_index = _calculate_adi(S, sr, fft_size)
    except Exception as e:
        errors.append(f"ADI calculation failed: {e}")

    # AEI
    try:
        result.acoustic_evenness_index = _calculate_aei(S, sr, fft_size)
    except Exception as e:
        errors.append(f"AEI calculation failed: {e}")

    # NDSI
    try:
        result.ndsi = _calculate_ndsi(S, sr, fft_size)
    except Exception as e:
        errors.append(f"NDSI calculation failed: {e}")

    return result, errors


def _calculate_aci(S: np.ndarray, sr: int, fft_size: int, hop_length: int,
                   freq_step: float, time_step: float) -> float | None:
    """
    Acoustic Complexity Index (Pieretti et al. 2011).

    ACI = sum_t sum_f |I[f,t] - I[f,t+1]| / sum_t sum_f (I[f,t] + I[f,t+1])

    We group frequency bins into bands of `freq_step` Hz and time frames
    into groups of `time_step` seconds.
    """
    if S.shape[1] < 2:
        return None

    bin_width = sr / fft_size
    freq_bins_per_band = max(1, int(freq_step / bin_width))
    frames_per_time = max(1, int(time_step * sr / hop_length))

    aci_total = 0.0
    aci_denominator = 0.0

    for f_start in range(0, S.shape[0], freq_bins_per_band):
        f_end = min(f_start + freq_bins_per_band, S.shape[0])
        band = S[f_start:f_end, :]

        for t_start in range(0, band.shape[1] - 1, frames_per_time):
            t_end = min(t_start + frames_per_time, band.shape[1] - 1)
            segment = band[:, t_start:t_end + 1]

            diff = np.abs(np.diff(segment, axis=1))
            sum_diff = np.sum(diff)
            sum_total = np.sum(segment[:, :-1] + segment[:, 1:])

            if sum_total > 0:
                aci_total += sum_diff
                aci_denominator += sum_total

    if aci_denominator == 0:
        return None

    return float(aci_total / aci_denominator)


def _calculate_bi(S: np.ndarray, sr: int, fft_size: int,
                  bi_freq_min: float, bi_freq_max: float) -> float | None:
    """
    Bioacoustic Index (Boelman et al. 2007).

    BI = sum of energy in the bi_freq_min to bi_freq_max band,
    divided by total energy, scaled to a 0-10 range.
    """
    bin_width = sr / fft_size
    low_bin = int(bi_freq_min / bin_width)
    high_bin = int(bi_freq_max / bin_width)

    low_bin = max(1, low_bin)
    high_bin = min(S.shape[0], high_bin)

    if high_bin <= low_bin:
        return None

    bio_band = S[low_bin:high_bin, :]
    total = np.sum(S)

    if total == 0:
        return None

    ratio = np.sum(bio_band) / total
    # Scale to 0-10 range as per convention
    return float(ratio * 10)


def _calculate_spectral_entropy(S: np.ndarray) -> float | None:
    """
    Spectral entropy: Shannon entropy of the normalized mean power spectrum.

    H = -sum(p * log2(p)) where p = normalized power per frequency bin.
    Normalized by log2(N) to produce a 0-1 value.
    """
    mean_spectrum = np.mean(S, axis=1)
    power = mean_spectrum ** 2
    total_power = np.sum(power)

    if total_power == 0:
        return None

    p = power / total_power
    p = p[p > 0]  # Avoid log(0)
    entropy = -np.sum(p * np.log2(p))
    max_entropy = np.log2(len(p))

    if max_entropy == 0:
        return None

    return float(entropy / max_entropy)


def _calculate_temporal_entropy(y: np.ndarray) -> float | None:
    """
    Temporal entropy: Shannon entropy of the normalized temporal envelope.

    Uses the Hilbert envelope (analytic signal magnitude).
    """
    from scipy.signal import hilbert

    if len(y) < 2:
        return None

    envelope = np.abs(hilbert(y))
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


def _calculate_frequency_occupancy(S: np.ndarray, sr: int, fft_size: int,
                                   freq_min: float, freq_max: float) -> float | None:
    """
    Frequency-band occupancy: proportion of frequency bins (within the
    configured range) whose mean energy exceeds a threshold.
    """
    bin_width = sr / fft_size
    low_bin = max(1, int(freq_min / bin_width))
    high_bin = min(S.shape[0], int(freq_max / bin_width))

    if high_bin <= low_bin:
        return None

    band = S[low_bin:high_bin, :]
    mean_spectrum = np.mean(band, axis=1)

    if len(mean_spectrum) == 0:
        return None

    threshold = np.median(mean_spectrum) if np.any(mean_spectrum > 0) else 0
    if threshold == 0:
        return 0.0

    occupied = np.sum(mean_spectrum > threshold)
    return float(occupied / len(mean_spectrum))


def _calculate_adi(S: np.ndarray, sr: int, fft_size: int, num_bands: int = 10) -> float | None:
    """
    Acoustic Diversity Index (Pijanowski et al. 2011).

    Shannon entropy of energy across non-overlapping frequency bands.
    Bands are typically 1 kHz wide from 0 to 10 kHz.
    """
    bin_width = sr / fft_size
    bins_per_band = max(1, int(1000 / bin_width))  # 1 kHz bands

    band_energies = []
    for i in range(num_bands):
        start = i * bins_per_band
        end = min((i + 1) * bins_per_band, S.shape[0])
        if start >= S.shape[0]:
            break
        band_energies.append(float(np.sum(S[start:end, :])))

    total = sum(band_energies)
    if total == 0:
        return None

    p = np.array(band_energies) / total
    p = p[p > 0]
    entropy = -np.sum(p * np.log(p))  # Natural log per convention

    return float(entropy)


def _calculate_aei(S: np.ndarray, sr: int, fft_size: int, num_bands: int = 10) -> float | None:
    """
    Acoustic Evenness Index (Villanueva-Rivera et al. 2011).

    Gini coefficient of energy across frequency bands.
    """
    bin_width = sr / fft_size
    bins_per_band = max(1, int(1000 / bin_width))

    band_energies = []
    for i in range(num_bands):
        start = i * bins_per_band
        end = min((i + 1) * bins_per_band, S.shape[0])
        if start >= S.shape[0]:
            break
        band_energies.append(float(np.sum(S[start:end, :])))

    if len(band_energies) < 2:
        return None

    values = np.sort(band_energies)
    n = len(values)
    cumulative = np.cumsum(values)

    if cumulative[-1] == 0:
        return None

    gini = (2 * np.sum((np.arange(1, n + 1)) * values) / (n * cumulative[-1])) - (n + 1) / n
    return float(max(0, gini))


def _calculate_ndsi(S: np.ndarray, sr: int, fft_size: int) -> float | None:
    """
    Normalized Difference Soundscape Index (Kasten et al. 2012).

    NDSI = (bio - anthro) / (bio + anthro)
    bio = 2-8 kHz band, anthro = 0-1 kHz band.
    """
    bin_width = sr / fft_size

    bio_low = int(2000 / bin_width)
    bio_high = int(8000 / bin_width)
    anthro_high = int(1000 / bin_width)

    bio_energy = float(np.sum(S[bio_low:bio_high, :])) if bio_high > bio_low else 0.0
    anthro_energy = float(np.sum(S[1:anthro_high, :])) if anthro_high > 1 else 0.0

    total = bio_energy + anthro_energy
    if total == 0:
        return None

    return float((bio_energy - anthro_energy) / total)


def analyze_recording(
    file_path: str,
    config: dict | None = None,
) -> AnalysisResult:
    """
    Full analysis pipeline for a single recording.
    Returns AnalysisResult with all features and any errors.
    """
    import time
    start = time.time()

    cfg = config or {}
    target_sr = cfg.get("target_sample_rate", 22050)
    mono = cfg.get("target_channel_mode", "mono") == "mono"
    clip_duration = cfg.get("clip_duration", None)
    if clip_duration and clip_duration <= 0:
        clip_duration = None
    start_offset = cfg.get("start_offset", 0.0)
    normalisation = cfg.get("normalisation_method", "none")

    y, sr, orig_sr, load_errors = load_and_standardize(
        file_path, target_sr, mono, clip_duration, start_offset, normalisation
    )

    if y is None:
        return AnalysisResult(
            technical=TechnicalFeatures(),
            ecoacoustic=EcoacousticFeatures(),
            errors=load_errors,
            runtime_seconds=time.time() - start,
        )

    technical = calculate_technical_features(y, sr, orig_sr, channel_count=1, config=cfg)
    ecoacoustic, eco_errors = calculate_ecoacoustic_features(y, sr, config=cfg)

    return AnalysisResult(
        technical=technical,
        ecoacoustic=ecoacoustic,
        errors=load_errors + eco_errors,
        warnings=[],
        runtime_seconds=time.time() - start,
    )
