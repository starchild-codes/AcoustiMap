import type {
  BrowserAudioFeatures,
  QualityAssessment,
  QualityThresholds,
  Recording,
  ValidationError,
  ValidationReport,
  ImportedRecordEntry,
  HabitatCategory,
} from './types'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

export async function decodeAudioFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<{ buffer: AudioBuffer; features: BrowserAudioFeatures; waveformPeaks: number[] }> {
  const ctx = getAudioContext()
  const arrayBuffer = await file.arrayBuffer()
  onProgress?.(0.3)
  const buffer = await ctx.decodeAudioData(arrayBuffer)
  onProgress?.(0.7)
  const features = calculateBrowserFeatures(buffer)
  const waveformPeaks = computeWaveformPeaks(buffer, 2000)
  onProgress?.(1)
  return { buffer, features, waveformPeaks }
}

export function calculateBrowserFeatures(buffer: AudioBuffer): BrowserAudioFeatures {
  const sampleRate = buffer.sampleRate
  const channels = buffer.numberOfChannels
  const duration = buffer.duration
  const numSamples = buffer.length

  const channelData: Float32Array[] = []
  for (let c = 0; c < channels; c++) {
    channelData.push(buffer.getChannelData(c))
  }

  let peak = 0
  let sumSquares = 0
  let zeroCrossings = 0
  let clippingCount = 0
  let silenceCount = 0
  const clippingThreshold = 0.99
  const silenceThreshold = 0.001

  const firstChannel = channelData[0]
  for (let i = 0; i < numSamples; i++) {
    const sample = firstChannel[i]
    const absSample = Math.abs(sample)
    if (absSample > peak) peak = absSample
    sumSquares += sample * sample
    if (absSample >= clippingThreshold) clippingCount++
    if (absSample < silenceThreshold) silenceCount++
    if (i > 0 && (firstChannel[i - 1] >= 0) !== (sample >= 0)) zeroCrossings++
  }

  const rms = Math.sqrt(sumSquares / numSamples)
  const dynamicRange = peak > 0 ? 20 * Math.log10(peak / (rms + 1e-10)) : 0
  const zcr = zeroCrossings / (numSamples - 1)
  const clippingPercent = (clippingCount / numSamples) * 100
  const silenceProportion = silenceCount / numSamples

  const { lowFreq, midFreq, highFreq } = computeFrequencyBands(buffer)

  return {
    duration,
    peakAmplitude: peak,
    rmsAmplitude: rms,
    dynamicRange,
    zeroCrossingRate: zcr,
    clippingPercent,
    silenceProportion,
    lowFreqEnergy: lowFreq,
    midFreqEnergy: midFreq,
    highFreqEnergy: highFreq,
    sampleRate,
    channels,
  }
}

function computeFrequencyBands(buffer: AudioBuffer): {
  lowFreq: number
  midFreq: number
  highFreq: number
} {
  const sampleRate = buffer.sampleRate
  const numSamples = buffer.length
  const fftSize = 2048
  const channelData = buffer.getChannelData(0)

  const lowCutoff = 500
  const midCutoff = 4000
  const nyquist = sampleRate / 2

  let lowEnergy = 0
  let midEnergy = 0
  let highEnergy = 0
  let totalEnergy = 0

  const stepSize = Math.floor(numSamples / 200)
  const actualStep = Math.max(stepSize, fftSize)

  for (let offset = 0; offset + fftSize <= numSamples; offset += actualStep) {
    const frame = channelData.subarray(offset, offset + fftSize)
    const spectrum = computeFFTMagnitude(frame)

    const binWidth = sampleRate / fftSize

    for (let i = 1; i < spectrum.length; i++) {
      const energy = spectrum[i] * spectrum[i]
      totalEnergy += energy
      if (i * binWidth < lowCutoff) {
        lowEnergy += energy
      } else if (i * binWidth < midCutoff) {
        midEnergy += energy
      } else {
        highEnergy += energy
      }
    }
  }

  const total = totalEnergy || 1
  void nyquist
  return {
    lowFreq: lowEnergy / total,
    midFreq: midEnergy / total,
    highFreq: highEnergy / total,
  }
}

export function computeFFTMagnitude(samples: Float32Array): Float32Array {
  const N = samples.length
  const real = new Float32Array(N)
  const imag = new Float32Array(N)

  for (let i = 0; i < N; i++) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
    real[i] = samples[i] * window
  }

  fftInPlace(real, imag)

  const magnitude = new Float32Array(N / 2)
  for (let i = 0; i < N / 2; i++) {
    magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i])
  }
  return magnitude
}

function fftInPlace(real: Float32Array, imag: Float32Array): void {
  const n = real.length
  if (n <= 1) return

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) {
      j ^= bit
    }
    j ^= bit
    if (i < j) {
      const tmpR = real[i]
      real[i] = real[j]
      real[j] = tmpR
      const tmpI = imag[i]
      imag[i] = imag[j]
      imag[j] = tmpI
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len
    const wReal = Math.cos(angle)
    const wImag = Math.sin(angle)
    for (let i = 0; i < n; i += len) {
      let curReal = 1
      let curImag = 0
      for (let j = 0; j < len / 2; j++) {
        const evenReal = real[i + j]
        const evenImag = imag[i + j]
        const oddReal = real[i + j + len / 2] * curReal - imag[i + j + len / 2] * curImag
        const oddImag = real[i + j + len / 2] * curImag + imag[i + j + len / 2] * curReal
        real[i + j] = evenReal + oddReal
        imag[i + j] = evenImag + oddImag
        real[i + j + len / 2] = evenReal - oddReal
        imag[i + j + len / 2] = evenImag - oddImag
        const newReal = curReal * wReal - curImag * wImag
        curImag = curReal * wImag + curImag * wReal
        curReal = newReal
      }
    }
  }
}

export function computeWaveformPeaks(buffer: AudioBuffer, targetPeaks: number): number[] {
  const numSamples = buffer.length
  const channelData = buffer.getChannelData(0)
  const samplesPerPeak = Math.floor(numSamples / targetPeaks)
  const peaks: number[] = []

  for (let i = 0; i < targetPeaks; i++) {
    const start = i * samplesPerPeak
    const end = Math.min(start + samplesPerPeak, numSamples)
    let max = 0
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }
  return peaks
}

export function computeSpectrogramData(
  buffer: AudioBuffer,
  fftSize: number,
  freqMax: number,
  contrast: number,
  targetCols = 300,
): { data: Float32Array[]; numBins: number; numCols: number; binWidth: number } {
  const sampleRate = buffer.sampleRate
  const channelData = buffer.getChannelData(0)
  const numSamples = buffer.length
  const hopSize = Math.max(Math.floor(numSamples / targetCols), fftSize / 2)
  const numCols = Math.floor((numSamples - fftSize) / hopSize) + 1
  const numBins = Math.min(Math.floor(freqMax / (sampleRate / fftSize)), fftSize / 2)
  const data: Float32Array[] = []

  for (let col = 0; col < numCols; col++) {
    const offset = col * hopSize
    const frame = channelData.subarray(offset, offset + fftSize)
    const spectrum = computeFFTMagnitude(frame)

    const clipped = new Float32Array(numBins)
    let maxMag = 0
    for (let i = 0; i < numBins; i++) {
      const mag = spectrum[i]
      if (mag > maxMag) maxMag = mag
      clipped[i] = mag
    }
    if (maxMag > 0) {
      for (let i = 0; i < numBins; i++) {
        const normalized = clipped[i] / maxMag
        clipped[i] = Math.pow(normalized, 1 / contrast)
      }
    }
    data.push(clipped)
  }

  return { data, numBins, numCols, binWidth: sampleRate / fftSize }
}

export function generateQualityWarnings(
  features: BrowserAudioFeatures,
  thresholds: QualityThresholds,
): string[] {
  const warnings: string[] = []
  if (features.clippingPercent > thresholds.clippingPercent) {
    warnings.push(`Clipping exceeds threshold (${features.clippingPercent.toFixed(2)}%)`)
  }
  if (features.silenceProportion > thresholds.silenceProportion) {
    warnings.push(`Silence exceeds threshold (${(features.silenceProportion * 100).toFixed(1)}%)`)
  }
  if (features.rmsAmplitude < thresholds.minRms) {
    warnings.push(`Extremely low RMS amplitude (${features.rmsAmplitude.toFixed(5)})`)
  }
  if (features.duration < thresholds.minDuration) {
    warnings.push(`Very short recording (${features.duration.toFixed(1)}s)`)
  }
  if (features.duration > thresholds.maxDuration) {
    warnings.push(`Very long recording (${features.duration.toFixed(0)}s)`)
  }
  if (features.lowFreqEnergy > thresholds.lowFreqNoiseRatio) {
    warnings.push(`Potential persistent low-frequency noise (${(features.lowFreqEnergy * 100).toFixed(0)}% of energy)`)
  }
  return warnings
}

export function recommendQuality(warnings: string[]): 'keep' | 'review' | 'exclude' {
  if (warnings.length >= 3) return 'exclude'
  if (warnings.length >= 1) return 'review'
  return 'keep'
}

export function createQualityAssessment(
  features: BrowserAudioFeatures | null,
  thresholds: QualityThresholds,
  existing?: Partial<QualityAssessment>,
): QualityAssessment {
  if (!features) {
    return {
      status: existing?.status ?? 'review',
      exclusionReason: existing?.exclusionReason ?? null,
      reviewerNotes: existing?.reviewerNotes ?? '',
      warnings: [],
      autoRecommendation: 'review',
    }
  }
  const warnings = generateQualityWarnings(features, thresholds)
  const autoRec = recommendQuality(warnings)
  return {
    status: existing?.status ?? (autoRec === 'exclude' ? 'excluded' : autoRec === 'review' ? 'review' : 'good'),
    exclusionReason: existing?.exclusionReason ?? null,
    reviewerNotes: existing?.reviewerNotes ?? '',
    warnings,
    autoRecommendation: autoRec,
  }
}

export function validateFile(file: File): string | null {
  const validTypes = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/ogg', 'audio/vorbis']
  const validExtensions = ['.wav', '.mp3', '.m4a', '.ogg']
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
    return `Unsupported file format: ${file.type || ext}. Supported: WAV, MP3, M4A, OGG.`
  }
  return null
}

export function generateId(): string {
  return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

export function normalizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function matchImportedToRecording(
  imported: ImportedRecordEntry,
  recordings: Recording[],
): Recording | null {
  const impId = imported.recordingId
  const impFname = imported.filename
  const impNorm = impFname ? normalizeFilename(impFname) : impId

  for (const rec of recordings) {
    if (rec.metadata.id === impId) return rec
  }
  if (impFname) {
    for (const rec of recordings) {
      if (rec.metadata.filename === impFname) return rec
    }
  }
  for (const rec of recordings) {
    if (normalizeFilename(rec.metadata.filename) === impNorm) return rec
  }
  return null
}

export function validateAnalysisImport(obj: unknown): ValidationReport {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  if (typeof obj !== 'object' || obj === null) {
    errors.push({
      field: 'root',
      recordingId: null,
      expected: 'JSON object',
      actual: typeof obj,
      message: 'Imported data is not a valid JSON object.',
      suggestion: 'Ensure the file contains a valid JSON object.',
    })
    return { valid: false, errors, warnings, validRecordCount: 0, totalRecordCount: 0 }
  }

  const data = obj as Record<string, unknown>

  if (typeof data.schemaVersion !== 'string') {
    errors.push({
      field: 'schemaVersion',
      recordingId: null,
      expected: 'string (e.g. "1.0")',
      actual: String(data.schemaVersion),
      message: 'Missing or invalid schemaVersion.',
      suggestion: 'Add "schemaVersion": "1.0" to the root.',
    })
  }

  const project = data.project as Record<string, unknown> | undefined
  if (!project || typeof project !== 'object') {
    errors.push({
      field: 'project',
      recordingId: null,
      expected: 'object with id, name, ecosystem, location',
      actual: String(data.project),
      message: 'Missing or invalid project object.',
      suggestion: 'Add a "project" object with required fields.',
    })
  } else {
    for (const field of ['id', 'name', 'ecosystem', 'location']) {
      if (typeof project[field] !== 'string') {
        errors.push({
          field: `project.${field}`,
          recordingId: null,
          expected: 'string',
          actual: String(project[field]),
          message: `Missing or invalid project.${field}.`,
          suggestion: `Add a string value for project.${field}.`,
        })
      }
    }
  }

  const recordings = data.recordings
  if (!Array.isArray(recordings)) {
    errors.push({
      field: 'recordings',
      recordingId: null,
      expected: 'array of recording objects',
      actual: String(recordings),
      message: 'Missing or invalid recordings array.',
      suggestion: 'Add a "recordings" array.',
    })
    return { valid: false, errors, warnings, validRecordCount: 0, totalRecordCount: 0 }
  }

  const seenIds = new Set<string>()
  const validHabitats: HabitatCategory[] = ['healthy', 'restored', 'degraded']

  for (let i = 0; i < recordings.length; i++) {
    const rec = recordings[i] as Record<string, unknown>
    const recId = rec?.recordingId as string | undefined

    if (!recId || typeof recId !== 'string') {
      errors.push({
        field: `recordings[${i}].recordingId`,
        recordingId: null,
        expected: 'non-empty string',
        actual: String(recId),
        message: `Recording at index ${i} is missing a recordingId.`,
        suggestion: 'Add a unique recordingId string.',
      })
      continue
    }

    if (seenIds.has(recId)) {
      errors.push({
        field: `recordings[${i}].recordingId`,
        recordingId: recId,
        expected: 'unique recording ID',
        actual: recId,
        message: `Duplicate recording ID: "${recId}".`,
        suggestion: 'Remove or rename the duplicate entry.',
      })
      continue
    }
    seenIds.add(recId)

    const habitat = rec.habitatCategory as string | undefined
    if (!habitat || !validHabitats.includes(habitat as HabitatCategory)) {
      errors.push({
        field: `recordings[${i}].habitatCategory`,
        recordingId: recId,
        expected: 'one of: healthy, restored, degraded',
        actual: String(habitat),
        message: `Invalid habitat category for recording "${recId}".`,
        suggestion: 'Use "healthy", "restored", or "degraded".',
      })
    }

    if (rec.filename !== null && rec.filename !== undefined && typeof rec.filename !== 'string') {
      errors.push({
        field: `recordings[${i}].filename`,
        recordingId: recId,
        expected: 'string or null',
        actual: String(rec.filename),
        message: `Invalid filename for recording "${recId}".`,
        suggestion: 'Use a string filename or null.',
      })
    }

    const features = rec.features as Record<string, unknown> | undefined
    if (features) {
      const numericFields = ['aci', 'bi', 'biologicalFrequencyOccupancy', 'anthropogenicNoisePressure', 'spectralEntropy']
      for (const f of numericFields) {
        const val = features[f]
        if (val !== null && val !== undefined) {
          if (typeof val !== 'number' || isNaN(val)) {
            errors.push({
              field: `recordings[${i}].features.${f}`,
              recordingId: recId,
              expected: 'number',
              actual: String(val),
              message: `Invalid ${f} for recording "${recId}".`,
              suggestion: 'Provide a numeric value or null.',
            })
          }
        }
      }
    }
  }

  const validRecordCount = recordings.length - errors.filter((e) => e.recordingId !== null).length
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validRecordCount: Math.max(0, validRecordCount),
    totalRecordCount: recordings.length,
  }
}
