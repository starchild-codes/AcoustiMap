# Audio Preprocessing

## Pipeline steps

1. **Decode** — Audio loaded via SoundFile (WAV, FLAC) or Librosa (OGG, MP3, M4A with FFmpeg)
2. **Channel conversion** — Mono averages all channels; stereo preserves or up-mixes
3. **DC offset removal** — Subtracts the mean amplitude (enabled by default)
4. **Resampling** — Librosa resampling to target sample rate (default: 22050 Hz)
5. **Amplitude normalisation** — None (default), peak (scale to 1.0), or RMS (target 0.1)
6. **Invalid value detection** — NaN/infinity check after all transformations

## Normalisation modes

| Mode | Formula | Notes |
|------|---------|-------|
| none | No change | Default |
| peak | x / max(\|x\|) | Preserves silence (no division by zero) |
| rms | x × (0.1 / rms) | Clamped to [0.01, 100] gain |

## What is NOT applied

- No noise reduction
- No source separation
- No speech removal
- No spectral subtraction
- No automatic gain control beyond the configured normalisation

These would require validated implementations and are outside the current scope.
