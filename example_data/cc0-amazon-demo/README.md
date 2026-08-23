# CC0 Amazon soundscape demo source

This directory documents a reproducible, real-audio demo source. It intentionally does **not** contain inferred scores, generated ecology, or a precomputed result. Each recording must be uploaded and processed through AcoustiMap's backend.

## Source and rights

- Source: [Toucans singing in the Amazonian Rainforest (Brazil)](https://commons.wikimedia.org/wiki/File:404114_felix-blume_toucans-singing-in-the-amazonian-rainforest-brazil.ogg)
- Recordist: Felix Blume
- Location: forest near Tauary, Amazonas, Brazil (coordinates retained on the source page)
- Original recording date: 2017-10-09
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- Download: use the **Original file** link on the Wikimedia Commons source page. This source is a 7m14s OGG recording and may be rate-limited by Wikimedia; do not bypass rate limits.

The source page records the recording context, original equipment, file checksum, and the CC0 dedication. Preserve its URL and the downloaded file's SHA-256 in your project notes. CC0 does not require attribution, but retain this provenance as scientific good practice.

## Honest demo protocol

The single source is suitable only for a **pipeline and interface demonstration**, not for demonstrating ecological restoration, biodiversity, or causality. Create three non-overlapping 60-second clips for each cohort using the offsets in `manifest.csv`; do not duplicate a clip within a cohort. Use the supplied roles and dates only to exercise reference selection and temporal handling.

The three degraded entries are intentionally labelled `synthetic degraded reference` in the manifest because they require a documented, deterministic preprocessing transform. Do not present their results as measured degraded habitat. The restored entries are repeated observations from the same recording and must likewise carry the `technical demonstration` label.

## Preparation

1. Download the original OGG into this directory as `amazon_toucans_cc0.ogg`.
2. Use an auditable audio tool to create the named clips from `manifest.csv`; retain source offsets and the exact transformation command in project notes.
3. For degraded clips only, use the specified transform: low-pass at 1,500 Hz, mix 50% pink noise at -18 dB relative to the source, and normalize peak level to -1 dBFS. This creates a technical contrast and is not an ecological simulation.
4. Upload all nine clips with their role, ISO-8601 timestamp, monitoring period, and `Demo — technical only` note.
5. Run the real worker. Keep the demo/project label and interpretation limitation visible in any presentation.

This protocol is deliberately conservative: it proves the data path, quality-review workflow, exports, and temporal date handling. It does not validate ecological inference.
