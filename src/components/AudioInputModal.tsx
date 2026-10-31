import React, { useState } from "react";
import { X, Upload, Sparkles, FileAudio, AlertCircle, FileText } from "lucide-react";
import { TranscriptLine } from "../types/ielts";

interface AudioInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAudioTranscribed: (payload: {
    sectionTitle: string;
    partLabel: string;
    audioUrl: string;
    totalDuration: number;
    lines: TranscriptLine[];
  }) => void;
}

export const AudioInputModal: React.FC<AudioInputModalProps> = ({
  isOpen,
  onClose,
  onAudioTranscribed,
}) => {
  const [activeTab, setActiveTab] = useState<"upload_audio" | "paste_script">("upload_audio");
  const [audioFileName, setAudioFileName] = useState<string>("");
  const [audioObjectUrl, setAudioObjectUrl] = useState<string>("");
  const [audioBase64, setAudioBase64] = useState<string>("");
  const [audioMimeType, setAudioMimeType] = useState<string>("audio/mp3");
  const [audioDuration, setAudioDuration] = useState<number>(45);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Script paste fields
  const [customTitle, setCustomTitle] = useState<string>(
    "IELTS Part 2 · City Library Renovation Briefing"
  );
  const [rawScript, setRawScript] = useState<string>(
    `Librarian: Good afternoon everyone, and welcome to the tour of our newly renovated Central City Library.\nLibrarian: The ground floor west wing used to house old periodicals, but we have converted it into a Digital Media Studio.\nVisitor: Excuse me, is the Digital Media Studio open on Sunday evenings?\nLibrarian: It's open until 8 PM from Monday to Saturday, and on Sundays it closes earlier at 4:30 PM.\nLibrarian: If you wish to book a soundproof editing booth, please register using your student card at the main desk.`
  );

  if (!isOpen) return null;

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setAudioFileName(file.name);
    setAudioMimeType(file.type || "audio/mp3");

    const objectUrl = URL.createObjectURL(file);
    setAudioObjectUrl(objectUrl);

    // Probe duration with temporary Audio element
    const tempAudio = new Audio(objectUrl);
    tempAudio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(tempAudio.duration) && tempAudio.duration > 0) {
        setAudioDuration(Math.ceil(tempAudio.duration));
      }
    });

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = String(reader.result || "");
      const base64 = resultStr.split(",")[1] || "";
      setAudioBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleTranscribeUploadedAudio = async () => {
    if (!audioBase64) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioMimeType,
          durationSeconds: audioDuration,
          title: audioFileName.replace(/\.[^.]+$/, ""),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to transcribe uploaded audio.");
      }

      const lines: TranscriptLine[] = (data.lines || []).map((l: any, idx: number) => ({
        id: `custom-line-${Date.now()}-${idx}`,
        speaker: String(l.speaker || `Speaker ${(idx % 2) + 1}`),
        startTime: Number(l.startTime) || idx * 6,
        endTime: Number(l.endTime) || (idx + 1) * 6,
        text: String(l.text || ""),
        isTranscriptVisible: true,
        keyVocabulary: Array.isArray(l.keyVocabulary) ? l.keyVocabulary : [],
        teachingNote: l.teachingNote || undefined,
      }));

      const maxEnd = lines.reduce((acc, l) => Math.max(acc, l.endTime), audioDuration);

      onAudioTranscribed({
        sectionTitle: data.sectionTitle || audioFileName,
        partLabel: data.partLabel || "Uploaded IELTS Audio",
        audioUrl: audioObjectUrl,
        totalDuration: maxEnd,
        lines,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Transcription failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuildFromScript = () => {
    const rawLines = rawScript
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      setErrorMsg("Please enter at least one line of transcript.");
      return;
    }

    let currentSec = 0;
    const builtLines: TranscriptLine[] = rawLines.map((row, idx) => {
      const colonIdx = row.indexOf(":");
      const speaker = colonIdx > 0 && colonIdx < 28 ? row.slice(0, colonIdx).trim() : `Speaker ${(idx % 2) + 1}`;
      const text = colonIdx > 0 && colonIdx < 28 ? row.slice(colonIdx + 1).trim() : row;
      const wordCount = text.split(/\s+/).length;
      const lineDur = Math.max(4, Math.round(wordCount * 0.45));
      const startTime = currentSec;
      const endTime = currentSec + lineDur;
      currentSec = endTime;

      const words = text
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length >= 6);

      return {
        id: `script-line-${Date.now()}-${idx}`,
        speaker,
        startTime,
        endTime,
        text,
        isTranscriptVisible: true,
        keyVocabulary: words.slice(0, 2),
      };
    });

    onAudioTranscribed({
      sectionTitle: customTitle.trim() || "Custom IELTS Listening Script",
      partLabel: "Custom Classroom Passage",
      audioUrl: "", // Will auto-synthesize seekable WAV + Web Speech
      totalDuration: currentSec,
      lines: builtLines,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-input-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 id="audio-input-modal-title" className="text-xl font-bold text-slate-900">
              Input IELTS Audio &amp; Generate Line-by-Line Transcript
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Upload an audio recording (MP3, WAV, M4A) for AI transcription with timestamps, or paste an IELTS script to generate playable line-by-line audio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audio input modal"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("upload_audio")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "upload_audio"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileAudio className="w-3.5 h-3.5" />
            <span>Upload Audio File (AI Transcribe)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paste_script")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "paste_script"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste / Edit Dialogue Script</span>
          </button>
        </div>

        {activeTab === "upload_audio" ? (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-8 bg-slate-50/70 cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-sky-600 mb-2" />
              <span className="text-sm font-semibold text-slate-800">
                Select an IELTS Listening audio file (.mp3, .wav, .m4a, .ogg)
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Automatically segments speaker turns, timestamps, and IELTS teaching notes
              </span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="hidden"
              />
            </label>

            {audioFileName && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-900">{audioFileName}</p>
                  <p className="text-xs text-slate-500 font-mono-tabular">
                    Detected Duration: {audioDuration}s
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTranscribeUploadedAudio}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isProcessing
                      ? "Transcribing & Segmenting Audio..."
                      : "Transcribe & Load into Studio"}
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="passage-title-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Passage Title
              </label>
              <input
                id="passage-title-input"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="passage-script-textarea"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Dialogue Lines (One line per turn, e.g. Speaker: Text)
              </label>
              <textarea
                id="passage-script-textarea"
                rows={6}
                value={rawScript}
                onChange={(e) => setRawScript(e.target.value)}
                className="w-full p-3 text-sm rounded-lg border border-slate-300 text-slate-900 leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleBuildFromScript}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Interactive Transcript &amp; Audio Track</span>
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
