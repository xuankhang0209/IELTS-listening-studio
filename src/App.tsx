import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Camera,
  Lightbulb,
  BookOpen,
  Play,
  Repeat,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  IeltsPassage,
  IeltsQuestion,
  LoopConfig,
  MaskingStyle,
  TranscriptLine,
} from "./types/ielts";
import { SAMPLE_PASSAGES } from "./data/samplePassages";
import {
  computeSectionRange,
  evaluatePlaybackBoundary,
  findActiveLineId,
  setLinesVisibility,
  toggleLineVisibility,
} from "./utils/listeningLogic";
import {
  buildPassageWavUrl,
  speakTranscriptLine,
  stopSpeaking,
} from "./utils/audioSynthesizer";
import { AudioDeck } from "./components/AudioDeck";
import { TranscriptLineCard } from "./components/TranscriptLineCard";
import { QuestionWorksheet } from "./components/QuestionWorksheet";
import { ImportScreenshotModal } from "./components/ImportScreenshotModal";
import { AudioInputModal } from "./components/AudioInputModal";

export function App() {
  const [passages, setPassages] = useState<IeltsPassage[]>(SAMPLE_PASSAGES);
  const [activePassageId, setActivePassageId] = useState<string>(
    SAMPLE_PASSAGES[0].id
  );

  const currentPassage =
    passages.find((p) => p.id === activePassageId) || passages[0];

  // Audio playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioSrc, setAudioSrc] = useState<string>("");
  const [isUsingCustomAudio, setIsUsingCustomAudio] = useState<boolean>(false);
  const [isSynthesizingTts, setIsSynthesizingTts] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(currentPassage.totalDuration);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [singlePlayEndTime, setSinglePlayEndTime] = useState<number | null>(null);
  const lastSpokenLineIdRef = useRef<string | null>(null);

  // Loop & Section Repeat state
  const [loop, setLoop] = useState<LoopConfig>({
    enabled: false,
    mode: "none",
    startLineIndex: 0,
    endLineIndex: Math.min(2, currentPassage.lines.length - 1),
    startTime: currentPassage.lines[0]?.startTime || 0,
    endTime:
      currentPassage.lines[Math.min(2, currentPassage.lines.length - 1)]
        ?.endTime || 15,
    repeatCount: 0,
    autoHideOnStart: false,
  });

  // Transcript masking & teacher note settings
  const [maskingStyle, setMaskingStyle] = useState<MaskingStyle>("full_mask");
  const [showTeachingNotes, setShowTeachingNotes] = useState<boolean>(true);

  // Worksheet answers state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isWorksheetSubmitted, setIsWorksheetSubmitted] =
    useState<boolean>(false);
  const [showAnswerKeys, setShowAnswerKeys] = useState<boolean>(false);

  // Modals
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] =
    useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Rebuild fallback WAV track when switching passages if no custom audio URL is set
  useEffect(() => {
    stopSpeaking();
    setIsPlaying(false);
    setCurrentTime(0);
    setSinglePlayEndTime(null);
    lastSpokenLineIdRef.current = null;
    setDuration(currentPassage.totalDuration);

    const endIdx = Math.min(2, Math.max(0, currentPassage.lines.length - 1));
    const range = computeSectionRange(currentPassage.lines, 0, endIdx);
    setLoop({
      enabled: false,
      mode: "none",
      startLineIndex: range.startIndex,
      endLineIndex: range.endIndex,
      startTime: range.startTime,
      endTime: range.endTime,
      repeatCount: 0,
      autoHideOnStart: false,
    });

    if (currentPassage.audioUrl) {
      setAudioSrc(currentPassage.audioUrl);
      setIsUsingCustomAudio(true);
    } else {
      const wavUrl = buildPassageWavUrl(
        currentPassage.lines,
        currentPassage.totalDuration
      );
      setAudioSrc(wavUrl);
      setIsUsingCustomAudio(false);
      return () => {
        URL.revokeObjectURL(wavUrl);
      };
    }
  }, [currentPassage.id, currentPassage.audioUrl]);

  // Synchronize HTML5 <audio> timeupdate with loop & single-line boundaries
  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    const now = el.currentTime;
    setCurrentTime(now);

    const boundary = evaluatePlaybackBoundary(now, loop, singlePlayEndTime);
    if (boundary.action === "jump_to_loop_start") {
      el.currentTime = boundary.targetTime;
      setCurrentTime(boundary.targetTime);
      lastSpokenLineIdRef.current = null;
      setLoop((prev) => ({ ...prev, repeatCount: prev.repeatCount + 1 }));
      if (el.paused) {
        el.play().catch(() => {});
      }
      return;
    }

    if (boundary.action === "stop_single_line") {
      el.pause();
      stopSpeaking();
      setIsPlaying(false);
      setSinglePlayEndTime(null);
      return;
    }

    // Trigger browser speech synthesis on line transitions when playing built-in track
    if (!isUsingCustomAudio && !el.paused) {
      const activeId = findActiveLineId(currentPassage.lines, now);
      if (activeId && activeId !== lastSpokenLineIdRef.current) {
        lastSpokenLineIdRef.current = activeId;
        const activeLine = currentPassage.lines.find((l) => l.id === activeId);
        if (activeLine) {
          speakTranscriptLine(
            activeLine.text,
            activeLine.speaker,
            playbackRate
          );
        }
      }
    }
  };

  const updateCurrentPassage = (updater: (p: IeltsPassage) => IeltsPassage) => {
    setPassages((prev) =>
      prev.map((p) => (p.id === currentPassage.id ? updater(p) : p))
    );
  };

  // Play Full Audio from Start (00:00) to Finish
  const handlePlayFullAudio = () => {
    const el = audioRef.current;
    setSinglePlayEndTime(null);
    setLoop((prev) => ({ ...prev, enabled: false, mode: "none", repeatCount: 0 }));
    lastSpokenLineIdRef.current = null;
    setCurrentTime(0);

    if (el) {
      el.currentTime = 0;
      el.playbackRate = playbackRate;
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(true));
    } else {
      setIsPlaying(true);
    }

    if (!isUsingCustomAudio && currentPassage.lines[0]) {
      lastSpokenLineIdRef.current = currentPassage.lines[0].id;
      speakTranscriptLine(
        currentPassage.lines[0].text,
        currentPassage.lines[0].speaker,
        playbackRate
      );
    }
  };

  const handleTogglePlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setSinglePlayEndTime(null);
      el.playbackRate = playbackRate;
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(true));
    }
  };

  const handleSeek = (targetSec: number) => {
    const el = audioRef.current;
    const clamped = Math.max(0, Math.min(duration || 60, targetSec));
    setSinglePlayEndTime(null);
    lastSpokenLineIdRef.current = null;
    setCurrentTime(clamped);
    if (el) {
      el.currentTime = clamped;
    }
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Play a specific line once (from line.startTime to line.endTime)
  const handlePlayLineOnce = (lineIndex: number) => {
    const line = currentPassage.lines[lineIndex];
    if (!line) return;

    const el = audioRef.current;
    const activeId = findActiveLineId(currentPassage.lines, currentTime);

    // If already playing this exact line in non-loop mode, pause it
    if (isPlaying && activeId === line.id && !loop.enabled) {
      el?.pause();
      stopSpeaking();
      setIsPlaying(false);
      setSinglePlayEndTime(null);
      return;
    }

    setLoop((prev) => ({ ...prev, enabled: false, mode: "none", repeatCount: 0 }));
    setSinglePlayEndTime(line.endTime);
    setCurrentTime(line.startTime);
    lastSpokenLineIdRef.current = line.id;

    if (el) {
      el.currentTime = line.startTime;
      el.playbackRate = playbackRate;
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(true));
    } else {
      setIsPlaying(true);
    }

    if (!isUsingCustomAudio) {
      speakTranscriptLine(line.text, line.speaker, playbackRate);
    }
  };

  // Play a single line repeatedly (with option to hide transcript first)
  const handleLoopSingleLine = (
    lineIndex: number,
    hideTranscriptFirst: boolean
  ) => {
    const line = currentPassage.lines[lineIndex];
    if (!line) return;

    // Toggle off if already looping this exact single line
    if (
      loop.enabled &&
      loop.mode === "single_line" &&
      loop.startLineIndex === lineIndex
    ) {
      setLoop((prev) => ({ ...prev, enabled: false, mode: "none", repeatCount: 0 }));
      return;
    }

    if (hideTranscriptFirst) {
      updateCurrentPassage((p) => ({
        ...p,
        lines: setLinesVisibility(p.lines, false, lineIndex, lineIndex),
      }));
    }

    setSinglePlayEndTime(null);
    setLoop({
      enabled: true,
      mode: "single_line",
      startLineIndex: lineIndex,
      endLineIndex: lineIndex,
      startTime: line.startTime,
      endTime: line.endTime,
      repeatCount: 0,
      autoHideOnStart: hideTranscriptFirst,
    });

    setCurrentTime(line.startTime);
    lastSpokenLineIdRef.current = line.id;

    const el = audioRef.current;
    if (el) {
      el.currentTime = line.startTime;
      el.playbackRate = playbackRate;
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(true));
    } else {
      setIsPlaying(true);
    }

    if (!isUsingCustomAudio) {
      speakTranscriptLine(line.text, line.speaker, playbackRate);
    }
  };

  // Update A–B Section Range Loop (and optionally hide transcript in that section first)
  const handleUpdateLoopRange = (
    startIdx: number,
    endIdx: number,
    enableLoop: boolean,
    hideFirst: boolean
  ) => {
    const range = computeSectionRange(currentPassage.lines, startIdx, endIdx);

    if (hideFirst) {
      updateCurrentPassage((p) => ({
        ...p,
        lines: setLinesVisibility(
          p.lines,
          false,
          range.startIndex,
          range.endIndex
        ),
      }));
    }

    setSinglePlayEndTime(null);
    setLoop({
      enabled: enableLoop,
      mode: enableLoop ? "section_range" : "none",
      startLineIndex: range.startIndex,
      endLineIndex: range.endIndex,
      startTime: range.startTime,
      endTime: range.endTime,
      repeatCount: 0,
      autoHideOnStart: hideFirst,
    });

    if (enableLoop) {
      setCurrentTime(range.startTime);
      lastSpokenLineIdRef.current = null;
      const el = audioRef.current;
      if (el) {
        el.currentTime = range.startTime;
        el.playbackRate = playbackRate;
        el.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(true));
      } else {
        setIsPlaying(true);
      }

      const firstLine = currentPassage.lines[range.startIndex];
      if (!isUsingCustomAudio && firstLine) {
        lastSpokenLineIdRef.current = firstLine.id;
        speakTranscriptLine(firstLine.text, firstLine.speaker, playbackRate);
      }
    }
  };

  const handleSetLoopBoundaryFromLine = (
    index: number,
    boundary: "start" | "end"
  ) => {
    const newStart = boundary === "start" ? index : Math.min(loop.startLineIndex, index);
    const newEnd = boundary === "end" ? index : Math.max(loop.endLineIndex, index);
    handleUpdateLoopRange(newStart, newEnd, true, loop.autoHideOnStart);
  };

  const handleStopLoop = () => {
    setLoop((prev) => ({
      ...prev,
      enabled: false,
      mode: "none",
      repeatCount: 0,
    }));
  };

  const handleToggleLineVisibility = (lineId: string) => {
    updateCurrentPassage((p) => ({
      ...p,
      lines: toggleLineVisibility(p.lines, lineId),
    }));
  };

  const handleSetAllVisibility = (visible: boolean) => {
    updateCurrentPassage((p) => ({
      ...p,
      lines: setLinesVisibility(p.lines, visible),
    }));
  };

  // Synthesize studio neural multi-speaker audio via Gemini TTS
  const handleSynthesizeAiVoices = async () => {
    setIsSynthesizingTts(true);
    setStatusBanner(null);
    try {
      const response = await fetch("/api/tts-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: currentPassage.lines.map((l) => ({
            speaker: l.speaker,
            text: l.text,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.audioDataUrl) {
        throw new Error(data.error || "Could not synthesize neural audio.");
      }

      updateCurrentPassage((p) => ({
        ...p,
        audioUrl: data.audioDataUrl,
      }));
      setStatusBanner("Generated multi-speaker studio WAV audio for this passage.");
    } catch (err: any) {
      setStatusBanner(
        `Using built-in studio track (${err?.message || "TTS unavailable"}).`
      );
    } finally {
      setIsSynthesizingTts(false);
    }
  };

  // Import Questions from Screenshot callback
  const handleImportQuestions = (payload: {
    worksheetTitle: string;
    instructionText: string;
    questions: IeltsQuestion[];
  }) => {
    updateCurrentPassage((p) => ({
      ...p,
      worksheetTitle: payload.worksheetTitle,
      instructionText: payload.instructionText,
      questions: payload.questions,
    }));
    setUserAnswers({});
    setIsWorksheetSubmitted(false);
    setStatusBanner(
      `Imported ${payload.questions.length} questions from screenshot into the worksheet.`
    );
  };

  // Add a custom question row manually
  const handleAddManualQuestion = () => {
    const nextNum = currentPassage.questions.length + 1;
    const newQuestion: IeltsQuestion = {
      id: `manual-q-${Date.now()}`,
      questionNumber: nextNum,
      type: "gap_fill",
      prompt: `Additional Note ${nextNum}: Key term mentioned is [BLANK]`,
      acceptableAnswers: ["Gold", "78", "physiotherapist", "Haberdasher"],
      evidenceLineIndex: Math.min(nextNum - 1, currentPassage.lines.length - 1),
      explanation: "Custom teacher-added listening question.",
    };
    updateCurrentPassage((p) => ({
      ...p,
      questions: [...p.questions, newQuestion],
    }));
  };

  // Handle newly transcribed audio or script from AudioInputModal
  const handleAudioTranscribed = (payload: {
    sectionTitle: string;
    partLabel: string;
    audioUrl: string;
    totalDuration: number;
    lines: TranscriptLine[];
  }) => {
    const newId = `passage-custom-${Date.now()}`;
    const newPassage: IeltsPassage = {
      id: newId,
      sectionTitle: payload.sectionTitle,
      partLabel: payload.partLabel,
      cefrBand: "Custom Classroom Audio",
      totalDuration: payload.totalDuration,
      audioUrl: payload.audioUrl || undefined,
      lines: payload.lines,
      worksheetTitle: "Questions 1–3: Listening Comprehension Worksheet",
      instructionText:
        "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer, or click 'Import from Screenshot' to load your test paper.",
      questions: payload.lines.slice(0, 3).map((l, idx) => {
        const keyWord =
          l.keyVocabulary?.[0] ||
          l.text
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .split(/\s+/)
            .find((w) => w.length >= 5) ||
          "answer";
        const promptWithBlank = l.text.replace(
          new RegExp(`\\b${keyWord}\\b`, "i"),
          "[BLANK]"
        );
        return {
          id: `${newId}-q${idx + 1}`,
          questionNumber: idx + 1,
          type: "gap_fill",
          prompt:
            promptWithBlank !== l.text
              ? promptWithBlank
              : `${l.speaker} mentions: [BLANK]`,
          acceptableAnswers: [keyWord],
          evidenceLineIndex: idx,
          explanation: `Heard in Line ${idx + 1} (${l.speaker}).`,
        };
      }),
    };

    setPassages((prev) => [newPassage, ...prev]);
    setActivePassageId(newId);
    setUserAnswers({});
    setIsWorksheetSubmitted(false);
    setStatusBanner(
      `Loaded "${payload.sectionTitle}" with ${payload.lines.length} timestamped transcript lines.`
    );
  };

  const activeLineId = findActiveLineId(currentPassage.lines, currentTime);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            setDuration(d);
          }
        }}
        onEnded={() => {
          if (loop.enabled && loop.mode !== "none") {
            const el = audioRef.current;
            if (el) {
              el.currentTime = loop.startTime;
              el.play().catch(() => {});
            }
          } else {
            setIsPlaying(false);
            setSinglePlayEndTime(null);
          }
        }}
      />

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
        >
          LexisListen
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary studio navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#audio-deck"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Audio Deck
          </a>
          <a
            href="#transcript-lines"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Transcript Lines
          </a>
          <a
            href="#question-sheet"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Question Sheet
          </a>
          <button
            type="button"
            onClick={() => setIsAudioModalOpen(true)}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Input Audio
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsScreenshotModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Import Screenshot
          </button>
        </div>
      </header>

      {/* Main Classroom Workspace (1440px container presence) */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Workspace Header & Passage Switcher Toolbar */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{currentPassage.partLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{currentPassage.cefrBand}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {currentPassage.lines.length} Lines ({Math.round(duration)}s)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight text-balance">
              {currentPassage.sectionTitle}
            </h1>
          </div>

          {/* Classroom Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Passage Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {passages.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActivePassageId(p.id);
                    setUserAnswers({});
                    setIsWorksheetSubmitted(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    p.id === currentPassage.id
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Passage {idx + 1}: {p.sectionTitle.split(":")[0].slice(0, 22)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsAudioModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Input Audio / Script</span>
            </button>

            <button
              type="button"
              onClick={() => setIsScreenshotModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Camera className="w-3.5 h-3.5 text-sky-600" />
              <span>Import Questions from Screenshot</span>
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusBanner && (
          <div className="px-4 py-2.5 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-between gap-4 text-xs text-sky-900">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="font-semibold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-Zone Educational Sandbox Layout (60% Interactive Transcript & Audio / 40% Question Sheet) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Zone (7 cols ~ 58%): Audio Deck + Line-by-Line Interactive Transcript */}
          <div id="audio-deck" className="lg:col-span-7 space-y-5">
            <AudioDeck
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              playbackRate={playbackRate}
              lines={currentPassage.lines}
              loop={loop}
              maskingStyle={maskingStyle}
              isUsingCustomAudio={isUsingCustomAudio}
              isSynthesizingTts={isSynthesizingTts}
              onPlayFullAudio={handlePlayFullAudio}
              onTogglePlayPause={handleTogglePlayPause}
              onSeek={handleSeek}
              onChangePlaybackRate={handleChangePlaybackRate}
              onUpdateLoopRange={handleUpdateLoopRange}
              onStopLoop={handleStopLoop}
              onSetAllVisibility={handleSetAllVisibility}
              onChangeMaskingStyle={setMaskingStyle}
              onSynthesizeAiVoices={handleSynthesizeAiVoices}
            />

            {/* Transcript Section Header & Quick Teaching Drill Presets */}
            <div
              id="transcript-lines"
              className="flex flex-wrap items-center justify-between gap-3 pt-1"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Line-by-Line Audio &amp; Transcript Controls
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeachingNotes((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    showTeachingNotes
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {showTeachingNotes
                      ? "Teaching Notes: On"
                      : "Teaching Notes: Off"}
                  </span>
                </button>
              </div>
            </div>

            {/* Transcript Line Cards */}
            <div className="space-y-3">
              {currentPassage.lines.map((line, index) => {
                const isActive = activeLineId === line.id;
                const isLoopingThisLine =
                  loop.enabled &&
                  loop.mode === "single_line" &&
                  loop.startLineIndex === index;
                const isInSectionLoop =
                  loop.enabled &&
                  index >= loop.startLineIndex &&
                  index <= loop.endLineIndex;

                return (
                  <TranscriptLineCard
                    key={line.id}
                    line={line}
                    index={index}
                    isActive={isActive}
                    isPlaying={isPlaying}
                    isLoopingThisLine={isLoopingThisLine}
                    isInSectionLoop={isInSectionLoop}
                    maskingStyle={maskingStyle}
                    showTeachingNotes={showTeachingNotes}
                    onPlayLineOnce={handlePlayLineOnce}
                    onLoopSingleLine={handleLoopSingleLine}
                    onToggleLineVisibility={handleToggleLineVisibility}
                    onSetLoopBoundary={handleSetLoopBoundaryFromLine}
                  />
                );
              })}
            </div>
          </div>

          {/* Right Zone (5 cols ~ 42%): Interactive IELTS Question Sheet */}
          <div id="question-sheet" className="lg:col-span-5 lg:sticky lg:top-6">
            <QuestionWorksheet
              worksheetTitle={currentPassage.worksheetTitle}
              instructionText={currentPassage.instructionText}
              questions={currentPassage.questions}
              lines={currentPassage.lines}
              userAnswers={userAnswers}
              isSubmitted={isWorksheetSubmitted}
              showAnswerKeys={showAnswerKeys}
              onChangeAnswer={(qId, val) => {
                setUserAnswers((prev) => ({ ...prev, [qId]: val }));
              }}
              onCheckAnswers={() => setIsWorksheetSubmitted(true)}
              onResetWorksheet={() => {
                setUserAnswers({});
                setIsWorksheetSubmitted(false);
              }}
              onToggleAnswerKeys={() => setShowAnswerKeys((prev) => !prev)}
              onPlayEvidenceLine={(lineIdx) => handlePlayLineOnce(lineIdx)}
              onOpenScreenshotModal={() => setIsScreenshotModalOpen(true)}
              onAddManualQuestion={handleAddManualQuestion}
            />
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            LexisListen Classroom Studio · Designed for IELTS Listening Instruction
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handlePlayFullAudio}
              className="hover:text-slate-900 cursor-pointer"
            >
              Play Full Audio
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => handleSetAllVisibility(false)}
              className="hover:text-slate-900 cursor-pointer"
            >
              Blind Listening Mode
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsScreenshotModalOpen(true)}
              className="hover:text-slate-900 cursor-pointer"
            >
              Import Question Screenshot
            </button>
          </div>
        </div>
      </footer>

      {/* Screenshot Import Modal */}
      <ImportScreenshotModal
        isOpen={isScreenshotModalOpen}
        lines={currentPassage.lines}
        onClose={() => setIsScreenshotModalOpen(false)}
        onImportQuestions={handleImportQuestions}
      />

      {/* Audio Input & AI Transcription Modal */}
      <AudioInputModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        onAudioTranscribed={handleAudioTranscribed}
      />
    </div>
  );
}

export default App;
