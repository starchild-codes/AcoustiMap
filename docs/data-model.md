# Data model

## Entities

### Project
- id (PK, string)
- name, description, ecosystem_type, country, region
- latitude, longitude
- restoration_intervention, intervention_date
- monitoring_start, monitoring_end
- status (draft, configuring, monitoring, analysis_ready, review_required, archived)
- privacy (public, private, sensitive)
- organisation, primary_contact, scientific_notes
- is_demo
- created_at, updated_at

### Site
- id (PK)
- project_id (FK → Project)
- name, site_type (restored, degraded, healthy)
- latitude, longitude
- habitat_description, recorder_id, recorder_model
- deployment_date, mic_height_depth, distance_to_noise
- notes, is_active

### Recording
- id (PK)
- project_id (FK), site_id (FK)
- filename, storage_path, file_size, mime_type, checksum
- habitat_category, timestamp, monitoring_period
- recorder_id, notes, uploaded_at

### AnalysisConfig
- id (PK), project_id (FK)
- name, is_default
- target_sample_rate, target_channel_mode, clip_duration, start_offset
- freq_min, freq_max, fft_size, window_size, hop_length
- aci_freq_step, aci_time_step, bi_freq_min, bi_freq_max
- silence_threshold, clipping_threshold, low_freq_noise_threshold
- normalisation_method, similarity_scaling_method, random_seed, software_version

### AnalysisJob
- id (PK), project_id (FK), config_id (FK)
- state (queued, preparing, decoding, calculating_quality, calculating_features, generating_artifacts, saving_results, completed, completed_with_warnings, failed, cancelled)
- total_recordings, processed_recordings, failed_recordings
- current_recording_id, current_stage, progress_percent
- error_summary, started_at, completed_at

### RecordingAnalysis
- id (PK), recording_id (FK), job_id (FK), config_id (FK)
- analysis_version, processed_at, input_checksum
- runtime_seconds, software_version, is_active
- technical_features (JSON), ecoacoustic_features (JSON)
- comparison (JSON), quality_info (JSON)
- artifacts (JSON), errors_warnings (JSON)

### QualityFlag
- id (PK), analysis_id (FK)
- flag_code, severity (info, review, exclude_recommended, fatal)
- measured_value, threshold, explanation, recommended_action

### ManualReview
- id (PK), analysis_id (FK)
- previous_status, new_status, reason, reviewer_notes
- created_at

### ProjectSummary
- id (PK), project_id (FK), config_id (FK)
- recovery_score, healthy_similarity, degraded_similarity
- improvement_over_degraded, evidence_consistency
- confidence_label, confidence_reasons (JSON)
- bootstrap_median, bootstrap_mean, bootstrap_std, bootstrap_ci_low, bootstrap_ci_high
- bootstrap_iterations
- included_recording_ids (JSON), excluded_recording_ids (JSON)
- feature_names (JSON), scaling_method
- warnings (JSON), calculated_at

## Relationships

```
Project 1—* Sites
Project 1—* Recordings
Project 1—* AnalysisConfigs
Project 1—* AnalysisJobs
Recording 1—* RecordingAnalyses
RecordingAnalysis 1—* QualityFlags
RecordingAnalysis 1—* ManualReviews
Project 1—* ProjectSummaries
```
