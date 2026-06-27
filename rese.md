# 🎵 SemBind-Audio

> **Semantic-Aware Zero-Trust Audio Watermarking using Transformer-based Audio Representations and Cryptographic Binding**

---

# 📌 Research Overview

SemBind-Audio is an ongoing research project investigating whether modern Transformer-based audio foundation models can be used to improve digital audio watermarking.

Unlike conventional audio watermarking techniques that primarily rely on energy, psychoacoustic masking, frequency coefficients, or handcrafted signal-processing features, this research explores whether semantic information extracted from self-supervised transformer models can contribute to more intelligent watermark generation, adaptive embedding, and secure audio authentication.

The research is currently focused on experimentally validating each design assumption before proposing the final watermarking algorithm.

---

# 🎯 Research Motivation

Digital audio watermarking has been studied for several decades. Most existing watermarking methods determine embedding locations using:

* Signal energy
* Psychoacoustic masking
* STFT coefficients
* DWT coefficients
* DCT coefficients
* Local spectral statistics
* Learned embedding networks

Although these methods provide robustness and imperceptibility, they generally do not consider the semantic understanding of the audio signal itself.

Recent Transformer-based audio foundation models such as HuBERT, wav2vec2, AST, BEATs, and AudioMAE learn high-level semantic representations directly from raw audio.

This raises an important research question:

> **Can semantic representations extracted from transformer models improve audio watermark generation and adaptive watermark embedding?**

---

# ❓ Research Questions

The research is divided into multiple experimental questions.

## RQ1

Can transformer-based audio models generate robust semantic representations?

---

## RQ2

Are semantic representations stable under common signal-processing attacks?

---

## RQ3

Can semantic embeddings be converted into unique semantic fingerprints?

---

## RQ4

Can semantic fingerprints be used as watermark payloads?

---

## RQ5

Do different spectrogram regions contribute differently to semantic understanding?

---

## RQ6

Are semantic importance regions different from traditional energy-based regions?

---

## RQ7

Do different transformer layers encode different semantic information?

---

## RQ8

Can transformer-derived semantic information guide adaptive watermark embedding?

---

# 🎯 Final Objective

The final goal of SemBind-Audio is to design a semantic-aware zero-trust audio watermarking framework capable of:

* generating semantic fingerprints,
* cryptographically binding ownership information,
* selecting adaptive embedding locations,
* embedding robust watermarks,
* authenticating ownership,
* surviving common signal-processing attacks.

---

# 🏗 Current Research Pipeline

```
                     Input Audio
                           │
                           ▼
               Transformer Audio Encoder
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
      Semantic Fingerprint      Spectrogram Analysis
             │                           │
             ▼                           ▼
 Cryptographic Watermark      Adaptive Region Selection
             │                           │
             └─────────────┬─────────────┘
                           ▼
                  Watermark Embedding
                           │
                           ▼
                     Attacked Audio
                           │
                           ▼
                 Watermark Extraction
                           │
                           ▼
                 Ownership Verification
```

---

# 📚 Literature Survey Summary

The literature survey covered the following research areas:

### Traditional Audio Watermarking

* Time-domain watermarking
* Frequency-domain watermarking
* STFT watermarking
* DWT watermarking
* DCT watermarking

---

### Adaptive Watermarking

* Energy-based region selection
* Psychoacoustic masking
* Local adaptive embedding
* Region-of-interest watermarking

---

### Deep Learning Watermarking

* CNN-based watermarking
* Autoencoder watermarking
* GAN watermarking
* Neural embedding networks

---

### Transformer-based Audio Models

* HuBERT
* wav2vec2
* AST
* BEATs
* AudioMAE
* CLAP

---

### Authentication

* Audio fingerprinting
* Semantic fingerprinting
* Cryptographic authentication
* Provenance verification

---

# 🔍 Research Gap

The literature survey indicates that existing adaptive watermarking methods generally rely on:

* signal energy,
* psychoacoustic masking,
* frequency coefficients,
* local signal statistics,
* learned embedding networks.

However, very little evidence was found showing explicit use of transformer-derived semantic representations for spectrogram-domain watermark embedding location selection.

This gap motivated the experimental investigations described in this repository.

---

# ⚠ Current Research Status

The project is currently in the experimental validation phase.

Rather than directly implementing a watermarking algorithm, each assumption is being validated experimentally before making any novelty claims.

This README documents every experiment performed throughout the research.

---

# 🧪 Experimental Methodology

The research was conducted experimentally rather than directly implementing a watermarking algorithm. Each assumption behind the proposed framework was validated individually before proceeding to the next stage.

The overall experimental workflow is shown below.

```
Literature Review
        │
        ▼
Research Gap Analysis
        │
        ▼
Experiment 1
Semantic Model Selection
        │
        ▼
Experiment 2
Embedding Robustness
        │
        ▼
Experiment 3
Semantic Fingerprint Generation
        │
        ▼
Experiment 4
Cryptographic Binding
        │
        ▼
Experiment 5
Fingerprint Robustness (BER)
        │
        ▼
Experiment 6
Spectrogram Patch Analysis
        │
        ▼
Experiment 7
Energy vs Semantic Comparison
        │
        ▼
Experiment 8
Transformer Layer Analysis
        │
        ▼
Current Research Stage
Adaptive Watermark Embedding Design
```

---

# 💻 Experimental Environment

## Hardware

Dell Vostro

Intel Core i3-1305U (13th Generation)

Intel UHD Graphics

8 GB RAM

Linux

Google Colab

---

## Software

Python

PyTorch

Transformers

Torchaudio

Librosa

Datasets (HuggingFace)

NumPy

Scikit-Learn

FFmpeg

---

# 📂 Datasets

Two datasets were used.

## Dataset 1

LibriSpeech ASR Dummy Dataset

Purpose:

Initial prototype development.

---

## Dataset 2

Banking77 Audio Dataset

Purpose:

Semantic similarity evaluation using naturally spoken utterances with different intents.

Example utterances:

* Open a joint account
* Lost debit card
* Transfer money
* Card activation
* Account balance

---

# 🧪 Experiment 1

# Selecting the Semantic Audio Model

---

## Objective

The first question was:

> Which transformer-based audio model should be used throughout the research?

The two candidate models selected were:

* wav2vec2
* HuBERT

---

## Motivation

If the semantic encoder itself cannot produce meaningful and discriminative representations, the remaining watermarking pipeline would not be reliable.

Therefore, selecting the correct semantic encoder became the first experimental task.

---

## Methodology

For each audio sample:

1. Load audio.
2. Generate transformer embeddings.
3. Mean-pool embeddings.
4. Compute cosine similarity between different audio samples.

The same procedure was performed for both wav2vec2 and HuBERT.

---

## Evaluation Metric

Cosine Similarity

Higher similarity for semantically similar samples and lower similarity for different samples indicates better representation quality.

---

## Results

### wav2vec2

Adjacent samples

```
0 vs 1 : 0.9559

1 vs 2 : 0.9354

2 vs 3 : 0.9600

3 vs 4 : 0.9545

4 vs 5 : 0.9131
```

---

### HuBERT

Adjacent samples

```
0 vs 1 : 0.8025

1 vs 2 : 0.7904

2 vs 3 : 0.6537

3 vs 4 : 0.8677

4 vs 5 : 0.8055
```

---

## Observation

HuBERT produced larger separation between different utterances compared to wav2vec2.

This indicates that HuBERT generated more discriminative semantic representations for the evaluated speech samples.

---

## Conclusion

HuBERT was selected as the semantic encoder for all subsequent experiments.

---

# 🧪 Experiment 2

# Robustness of Semantic Embeddings

---

## Objective

The next question was:

> Do semantic embeddings remain stable after common audio processing attacks?

If semantic embeddings themselves are unstable, then using them for watermark generation or authentication would not be meaningful.

---

## Attacks Applied

MP3 Compression

Resampling

Low-pass Filtering

Additive Gaussian Noise

---

## Methodology

1. Extract HuBERT embedding from original audio.

2. Apply attack.

3. Extract HuBERT embedding again.

4. Compute cosine similarity.

---

## Results

| Attack     | Cosine Similarity |
| ---------- | ----------------- |
| MP3        | 0.9989            |
| Resampling | 1.0000            |
| Low-pass   | 0.9964            |
| Noise      | 0.8186            |

---

## Observation

MP3 compression produced almost no semantic degradation.

Resampling produced almost identical embeddings.

Low-pass filtering produced only a very small change.

Noise caused the largest degradation.

---

## Conclusion

Semantic embeddings generated by HuBERT are highly robust against common signal-processing operations.

This makes them suitable candidates for semantic fingerprint generation.

---

# 🧪 Experiment 3

# Semantic Fingerprint Generation

---

## Objective

Determine whether transformer embeddings can be converted into compact binary fingerprints suitable for authentication.

---

## Methodology

Pipeline

```
Audio

↓

HuBERT

↓

768-dimensional embedding

↓

Thresholding / Quantization

↓

768-bit Binary Fingerprint
```

---

## Generated Fingerprint

Example

```
1111001101000100111101001000000010000101000110100011110110101100...
```

Fingerprint Length

```
768 bits
```

---

## Cryptographic Binding

The fingerprint was combined with ownership-related information.

Payload

```
Semantic Fingerprint

+

Owner Identity

+

Timestamp

↓

SHA-256
```

Example Hash

```
72356b41e2d261286502930fd7729e9fb898de6b0868b3d83d32e5c03695e457
```

Changing only a small portion of the fingerprint generated a completely different hash, demonstrating the avalanche property of SHA-256.

---

## Observation

A compact semantic fingerprint can be generated directly from transformer representations.

The fingerprint is suitable for cryptographic authentication and provenance verification.

---

## Conclusion

Semantic fingerprints appear to be a promising watermark payload because they encode semantic characteristics of the audio while remaining compact and suitable for secure verification.

---

# 🧪 Experiment 4

# Cryptographic Binding Validation

---

## Objective

After generating the semantic fingerprint, the next objective was to verify whether it could be securely bound with ownership information to support authentication and provenance verification.

Instead of embedding the raw fingerprint directly, a cryptographically secure watermark payload was generated.

---

## Methodology

The following information was combined:

```
Semantic Fingerprint
+
Owner Identity
+
Timestamp
```

The combined payload was hashed using SHA-256.

```
Payload
      │
      ▼
SHA-256
      │
      ▼
256-bit Secure Hash
```

---

## Example Output

Original Hash

```
72356b41e2d261286502930fd7729e9fb898de6b0868b3d83d32e5c03695e457
```

Modified Fingerprint Hash

```
57aaa9574c937b05dce5c820a0ba0b1d3b2d48c919f984db7af3430d823c4fbd
```

---

## Observation

Only a small change in the semantic fingerprint resulted in a completely different SHA-256 hash.

This demonstrates the avalanche property of cryptographic hash functions.

---

## Conclusion

The semantic fingerprint can be securely transformed into a cryptographic watermark payload suitable for authentication.

---

# 🧪 Experiment 5

# Fingerprint Robustness (BER Analysis)

---

## Objective

The semantic fingerprint should remain stable even after common signal-processing attacks.

To evaluate this, the Bit Error Rate (BER) between the original fingerprint and the attacked fingerprint was measured.

---

## Methodology

```
Original Audio
      │
      ▼
Semantic Fingerprint
      │
      ▼
Apply Attack
      │
      ▼
Generate New Fingerprint
      │
      ▼
Compute BER
```

---

## Attacks

* MP3 Compression
* Resampling
* Low-pass Filtering
* Additive Noise

---

## Results

| Attack     | BER    |
| ---------- | ------ |
| MP3        | 2.6%   |
| Resampling | 0%     |
| Low-pass   | 4.17%  |
| Noise      | 31.77% |

---

## Observation

The semantic fingerprint remained highly stable after MP3 compression and resampling.

Low-pass filtering introduced only a small number of bit changes.

Noise produced the highest degradation.

---

## Conclusion

The semantic fingerprint demonstrates promising robustness under realistic audio processing operations.

---

# 🧪 Experiment 6

# Spectrogram Patch Analysis

---

## Objective

One of the central research questions was:

> Do all spectrogram regions contribute equally to semantic understanding?

If not, those differences may be exploited for adaptive watermark placement.

---

## Methodology

1. Convert audio to STFT spectrogram.
2. Divide the spectrogram into patches.
3. Mask one patch at a time.
4. Reconstruct audio.
5. Extract HuBERT embedding.
6. Measure cosine similarity.

Semantic Importance:

```
Importance = 1 - Cosine Similarity
```

---

## First Experiment

Large time segments were removed.

Result

```
Patch 0 : 0.9823

Patch 1 : 0.9785

Patch 2 : 0.9829

Patch 3 : 0.9832
...
```

---

## Observation

Almost every large chunk produced nearly identical results.

This approach did not reveal meaningful semantic saliency.

---

## Improvement

Instead of masking waveform chunks, the analysis was shifted to spectrogram patches.

Spectrogram Size

```
1025 × 339
```

Partitioning

```
4 Frequency Bands

×

6 Time Bands

=

24 Patches
```

---

## Results

Examples

```
FreqBand=0 TimeBand=2

Importance = 0.1218
```

```
FreqBand=1 TimeBand=3

Importance = 0.0652
```

---

## Observation

Different spectrogram patches produced different semantic importance values.

Lower frequency regions generally contributed more strongly than higher frequency regions.

---

## Conclusion

The experiment demonstrates that spectrogram regions are not equally important for semantic representation.

However, this alone does not establish novelty.

---

# 🧪 Experiment 7

# Energy vs Semantic Comparison

---

## Objective

Determine whether semantic importance differs from traditional energy-based importance.

---

## Motivation

Most adaptive watermarking methods already use energy-based region selection.

If semantic importance simply reproduces energy, then no novelty exists.

---

## Methodology

For every spectrogram patch:

Compute

```
Average Energy
```

Compare against

```
Semantic Importance
```

---

## Highest Energy Regions

```
(0,2)

(0,4)

(0,1)
```

---

## Highest Semantic Regions

```
(0,2)

(0,4)

(0,1)
```

---

## Observation

The semantic importance ranking closely matched the energy ranking.

---

## Scientific Interpretation

Current semantic saliency generated using the final HuBERT embedding appears highly correlated with traditional energy-based methods.

---

## Conclusion

This experiment does **not** provide sufficient evidence that semantic-guided region selection is fundamentally different from existing adaptive watermarking approaches.

This negative result is important because it prevents making an unsupported novelty claim.

---

# 🧪 Experiment 8

# Transformer Layer Analysis

---

## Objective

Previous experiments only used the final HuBERT embedding.

The goal was to determine whether different transformer layers encode different information.

---

## Layers Investigated

* Layer 1
* Layer 3
* Layer 6
* Layer 9
* Layer 12

---

## Methodology

Extract embeddings independently from each transformer layer.

Compute cosine similarity between layers.

---

## Results

| Layer Pair | Similarity |
| ---------- | ---------- |
| 1 ↔ 3      | 0.604      |
| 1 ↔ 6      | 0.486      |
| 1 ↔ 9      | 0.426      |
| 1 ↔ 12     | **0.355**  |
| 6 ↔ 9      | 0.800      |
| 9 ↔ 12     | 0.673      |

---

## Observation

The similarity between early and late transformer layers is relatively low.

This indicates that different layers capture different levels of information.

---

## Scientific Interpretation

Earlier layers likely capture lower-level acoustic information.

Later layers capture increasingly abstract contextual representations.

Intermediate layers may therefore provide more suitable information for adaptive watermark region selection.

---

## Current Hypothesis

Instead of using only the final transformer layer, intermediate transformer layers may provide richer semantic guidance for adaptive watermark embedding.

This hypothesis will be validated in future experiments.

---

# 📊 Summary of Experiments

| Experiment | Objective                  | Status |
| ---------- | -------------------------- | ------ |
| 1          | HuBERT vs wav2vec2         | ✅      |
| 2          | Embedding Robustness       | ✅      |
| 3          | Semantic Fingerprint       | ✅      |
| 4          | Cryptographic Binding      | ✅      |
| 5          | BER Evaluation             | ✅      |
| 6          | Spectrogram Patch Analysis | ✅      |
| 7          | Energy vs Semantic         | ✅      |
| 8          | Transformer Layer Analysis | ✅      |

---

# 🔍 Current Findings

## Successfully Demonstrated

* HuBERT provides robust semantic representations.
* Semantic fingerprints can be generated.
* Fingerprints remain stable under common signal-processing attacks.
* Cryptographic binding is feasible.
* Spectrogram patches contribute differently to semantic representations.
* Transformer layers encode different information.

---

## Not Yet Demonstrated

* A semantic-guided embedding strategy superior to energy-based selection.
* A complete watermark embedding algorithm.
* Experimental superiority over existing watermarking methods.

---

# ⚠ Current Research Position

At the current stage, no novelty claim is being made.

Instead, every assumption is being experimentally validated before proposing the final watermarking framework.

The research now focuses on determining whether transformer-derived semantic information—particularly from intermediate layers or semantic stability analysis—can provide information beyond traditional energy-based adaptive watermarking.

---

# 🚀 Next Planned Experiments

1. Layer-wise Spectrogram Patch Analysis
2. Semantic Stability under MP3 Compression
3. Attention-based Region Selection
4. Gradient-based Semantic Attribution
5. Adaptive Watermark Embedding
6. Watermark Extraction
7. Robustness Evaluation
8. Comparison with Existing Watermarking Methods
9. Complete SemBind Framework Validation
