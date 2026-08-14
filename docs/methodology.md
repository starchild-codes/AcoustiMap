# Methodology

## Audio analysis pipeline

### 1. Audio loading and standardisation

Audio files are loaded using Librosa. The pipeline:
- Converts to mono if configured
- Resamples to the target sample rate (default: 22050 Hz)
- Optionally clips to a fixed duration
- Applies amplitude normalisation if configured
- Checks for NaN/infinity values

### 2. Technical quality features

All calculated in Python from decoded audio samples:

| Feature | Formula |
|---------|---------|
| Duration | N / sample_rate |
| Peak amplitude | max(\|x\|) |
| RMS amplitude | sqrt(mean(x²)) |
| Dynamic range | 20·log10(peak / (rms + ε)) |
| Clipping proportion | count(\|x\| ≥ threshold) / N |
| Silence proportion | count(\|x\| < threshold) / N |
| Zero-crossing rate | sign_changes / (N-1) |
| Low/mid/high freq energy | FFT band energy / total energy |
| Spectral centroid | mean(librosa.spectral_centroid) |
| Spectral bandwidth | mean(librosa.spectral_bandwidth) |
| Spectral rolloff | mean(librosa.spectral_rolloff) |

### 3. Ecoacoustic features

| Index | Method | Reference |
|-------|--------|-----------|
| ACI | Sum of \|I[f,t] - I[f,t+1]\| / Sum(I[f,t] + I[f,t+1]) | Pieretti et al. 2011 |
| Biological-Band Spectral Magnitude Ratio (×10) | Linear STFT magnitude in the configured band / total STFT magnitude, scaled ×10 | Project-specific feature; not canonical BI |
| Spectral entropy | Shannon entropy of normalised power spectrum / log2(N) | — |
| Temporal entropy | Shannon entropy of Hilbert envelope / log2(N) | — |
| Frequency-band occupancy | Proportion of bins above median energy | — |
| ADI | Shannon entropy of energy across 1 kHz bands | Pijanowski et al. 2011 |
| AEI | Gini coefficient of energy across 1 kHz bands | Villanueva-Rivera et al. 2011 |
| NDSI | (bio - anthro) / (bio + anthro), bio=2-8kHz, anthro=0-1kHz | Kasten et al. 2012 |

### 4. Quality control

Rule-based system with flags:
- decode_failure (fatal)
- too_short, too_long (info/review)
- near_silence, excessive_silence (exclude/review)
- excessive_clipping (exclude)
- low_frequency_noise (review)
- missing_timestamp, missing_site (info)
- unusual_sample_rate (info)

The system recommends a status but the user makes the final decision.

### 5. Reference model

- Extracts feature vectors from ecoacoustic features
- Scales features (standard, robust, or none)
- Computes healthy and degraded centroids
- Calculates Euclidean distance from each restored recording to each centroid
- Recovery position = dist_to_degraded / (dist_to_degraded + dist_to_healthy)

### 6. Confidence

Based on:
- Number of recordings per category (minimum 3 recommended)
- Exclusion ratio (max 30%)
- Feature count (minimum 3)
- Evidence consistency (coefficient of variation)
- Bootstrap stability

### 7. Bootstrap

Resamples within each habitat category with replacement, recomputes the recovery score.
Returns median, mean, standard deviation, and 95% confidence interval.
