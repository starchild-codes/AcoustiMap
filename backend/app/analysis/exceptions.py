"""Exception hierarchy for the audio analysis pipeline."""


class AudioAnalysisError(Exception):
    """Base exception for all analysis errors."""
    pass


class AudioDecodeError(AudioAnalysisError):
    """Raised when an audio file cannot be decoded."""
    pass


class InvalidAudioError(AudioAnalysisError):
    """Raised when audio data is invalid (NaN, empty, etc.)."""
    pass


class ConfigurationError(AudioAnalysisError):
    """Raised when the analysis configuration is invalid."""
    pass


class FeatureCalculationError(AudioAnalysisError):
    """Raised when a feature calculation fails."""
    pass


class InsufficientReferenceDataError(AudioAnalysisError):
    """Raised when there are too few reference recordings."""
    pass


class ArtifactGenerationError(AudioAnalysisError):
    """Raised when artifact (spectrogram/waveform) generation fails."""
    pass


class AnalysisCancelledError(AudioAnalysisError):
    """Raised when a running analysis job is cancelled cooperatively."""
    pass
