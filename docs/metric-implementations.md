# Metric Implementations

## ACI — Acoustic Complexity Index

**Definition:** ACI = Σ|I[f,t+1] - I[f,t]| / Σ I[f,t]
**Source:** Pieretti et al. (2011)
**Implementation:** Custom implementation operating on STFT magnitude spectrogram
**Parameters:**
- `aci_frequency_step_hz`: Frequency bin grouping (default 1000 Hz)
- `aci_time_step_seconds`: Time frame grouping (default 5s)
**Output range:** [0, ∞) — typically 0.1–1.5
**Edge cases:** Returns None for zero-energy spectrograms
**Interpretation:** Captures amplitude variation patterns. NOT a species count.
**Limitations:** Sensitive to gain and environmental noise.

## Biological-Band Spectral Magnitude Ratio (×10)

**Definition:** ratio = (sum of linear STFT magnitude in the configured biological band / total linear STFT magnitude) × 10
**Source:** Project-specific feature. This is not the canonical Bioacoustic Index described by Boelman et al. (2007).
**Implementation:** Custom implementation using STFT magnitude
**Parameters:**
- `biological_band_min_hz`: Lower bound (default 1000 Hz)
- `biological_band_max_hz`: Upper bound (default 10000 Hz)
**Output range:** [0, 10]
**Edge cases:** Returns 0.0 for silence (genuine result)
**Interpretation:** Proxy for biological acoustic activity in the configured band.
**Limitations:** Band selection affects results; anthropogenic sounds may occur in band.

## Spectral Entropy

**Definition:** H = -Σ p·log₂(p) / log₂(N), where p = normalised power per frequency bin
**Source:** Standard Shannon entropy
**Implementation:** NumPy
**Output range:** [0, 1] — 1 = uniform spectrum, 0 = single frequency
**Edge cases:** Returns None for zero-energy signals
**Interpretation:** Measures spectral diversity. White noise → high, pure tone → low.

## Temporal Entropy

**Definition:** H = -Σ p·log₂(p) / log₂(N), where p = normalised Hilbert envelope
**Source:** Standard Shannon entropy on temporal envelope
**Implementation:** SciPy (Hilbert transform) + NumPy
**Output range:** [0, 1]
**Edge cases:** Returns None for zero-energy signals
**Interpretation:** Measures temporal variability of the envelope.

## Biological-band Acoustic Occupancy

**Definition:** Proportion of time-frequency cells above a relative threshold
**Method:**
1. Compute dB spectrogram
2. Restrict to biological frequency range
3. Threshold = max(dB) + occupancy_relative_threshold_db
4. Count cells above threshold / total cells
**Parameters:**
- `biophony_min_hz`, `biophony_max_hz`: Biological band
- `occupancy_relative_threshold_db`: Relative threshold (default -40 dB)
**Output range:** [0, 1]
**Warning:** Labelled "Biological-band acoustic occupancy" — anthropogenic or geophysical sounds may also occur in the band.

## NDSI — Normalized Difference Soundscape Index

**Definition:** NDSI = (biophony - anthrophony) / (biophony + anthrophony)
**Source:** Kasten et al. (2012)
**Implementation:** Custom implementation using STFT magnitude
**Parameters:**
- `biophony_min_hz`, `biophony_max_hz`: Biophony band
- `anthrophony_min_hz`, `anthrophony_max_hz`: Anthrophony band
**Output range:** [-1, 1]
**Edge cases:** Returns None when denominator is zero
**Interpretation:** Frequency-band proxy, NOT confirmed anthropogenic-source detection.

## Anthropogenic Noise Pressure

**Definition:** anthrophony_band_energy / total_selected_band_energy
**Output range:** [0, 1]
**Interpretation:** Frequency-band proxy. Not all low-frequency sound is human-generated.

## ADI — Acoustic Diversity Index

**Definition:** Shannon diversity (natural log) of energy across 1 kHz frequency bands
**Source:** Pijanowski et al. (2011)
**Implementation:** Custom implementation
**Output range:** [0, ∞) — typically 0.5–2.5
**Edge cases:** Returns None for zero-energy signals

## AEI — Acoustic Evenness Index

**Definition:** Gini coefficient of energy across 1 kHz frequency bands
**Source:** Villanueva-Rivera et al. (2011)
**Implementation:** Custom implementation
**Output range:** [0, 1] — 0 = perfectly even, 1 = maximally uneven
**Edge cases:** Returns None for zero-energy signals
