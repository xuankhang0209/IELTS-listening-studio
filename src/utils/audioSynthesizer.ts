import { TranscriptLine } from "../types/ielts";

/**
 * Generates a valid, seekable 8kHz 16-bit mono WAV Blob URL matching the exact totalDuration
 * and speech-cadence envelope of the transcript lines so the HTML5 <audio> player
 * plays smoothly from start to finish or across any single line / A-B loop range,
 * even before an external MP3/WAV file is uploaded.
 */
export function buildPassageWavUrl(lines: TranscriptLine[], totalDurationSeconds: number): string {
  const sampleRate = 8000;
  const duration = Math.max(5, Math.ceil(totalDurationSeconds));
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF WAV Header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, 1, true);  // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);  // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Fill with gentle syllabic warm acoustic tone per speaker turn so waveform/audio is audible & distinct
  for (const line of lines) {
    const startSample = Math.max(0, Math.floor(line.startTime * sampleRate));
    const endSample = Math.min(numSamples, Math.floor(line.endTime * sampleRate));
    const isFirstSpeaker = line.speaker.toLowerCase().includes("receptionist") || line.speaker.toLowerCase().includes("vance");
    const baseFreq = isFirstSpeaker ? 195 : 145;

    for (let s = startSample; s < endSample; s++) {
      const t = s / sampleRate;
      const relT = t - line.startTime;
      const lineDur = Math.max(0.5, line.endTime - line.startTime);

      // Pause gap at very end of line
      if (relT > lineDur - 0.35) {
        view.setInt16(44 + s * 2, 0, true);
        continue;
      }

      // Syllable cadence modulation (approx 3.8 syllables/sec)
      const syllableEnv = Math.max(0, Math.sin(2 * Math.PI * 3.8 * relT));
      const phraseEnv = Math.min(1, relT / 0.15) * Math.min(1, (lineDur - 0.35 - relT) / 0.2);
      const pitchMod = baseFreq + 18 * Math.sin(2 * Math.PI * 1.3 * relT);
      const harmonic =
        0.65 * Math.sin(2 * Math.PI * pitchMod * t) +
        0.25 * Math.sin(2 * Math.PI * pitchMod * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * pitchMod * 3 * t);

      const sampleVal = Math.max(-1, Math.min(1, harmonic * syllableEnv * phraseEnv * 0.18));
      view.setInt16(44 + s * 2, Math.floor(sampleVal * 32767), true);
    }
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

/**
 * Uses the browser's native Web Speech API (if available and enabled) to speak
 * the current line aloud in sync with the simulated studio track when playing built-in passages.
 */
export function speakTranscriptLine(text: string, speaker: string, rate = 1.0): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = Math.min(1.5, Math.max(0.7, rate));
    const isHigherVoice =
      speaker.toLowerCase().includes("receptionist") ||
      speaker.toLowerCase().includes("elena") ||
      speaker.toLowerCase().includes("chloe");
    utterance.pitch = isHigherVoice ? 1.12 : 0.92;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors in headless environments
  }
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore
  }
}
