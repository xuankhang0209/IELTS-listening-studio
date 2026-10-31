import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  EyeOff,
  Eye,
  Volume2,
  Sparkles,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { LoopConfig, MaskingStyle, TranscriptLine } from "../types/ielts";
import { formatTimestamp } from "../utils/listeningLogic";

interface AudioDeckProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  lines: TranscriptLine[];
  loop: LoopConfig;
  maskingStyle: MaskingStyle;
  isUsingCustomAudio: boolean;
  isSynthesizingTts: boolean;
  onPlayFullAudio: () => void;
  onTogglePlayPause: () => void;
  onSeek: (time: number) => void;
  onChangePlaybackRate: (rate: number) => void;
  onUpdateLoopRange: (startIdx: number, endIdx: number, enableLoop: boolean, hideFirst: boolean) => void;
  onStopLoop: () => void;
  onSetAllVisibility: (visible: boolean) => void;
  onChangeMaskingStyle: (style: MaskingStyle) => void;
  onSynthesizeAiVoices: () => void;
}

export const AudioDeck: React.FC<AudioDeckProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  lines,
  loop,
  maskingStyle,
  isUsingCustomAudio,
  isSynthesizingTts,
  onPlayFullAudio,
  onTogglePlayPause,
  onSeek,
  onChangePlaybackRate,
  onUpdateLoopRange,
  onStopLoop,
  onSetAllVisibility,
  onChangeMaskingStyle,
  onSynthesizeAiVoices,
}) => {
  const safeDuration = Math.max(1, duration || 1);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));
  const loopLeftPercent = Math.min(100, Math.max(0, (loop.startTime / safeDuration) * 100));
  const loopWidthPercent = Math.min(
    100 - loopLeftPercent,
    Math.max(0, ((loop.endTime - loop.startTime) / safeDuration) * 100)
  );

  const visibleLinesCount = lines.filter((l) => l.isTranscriptVisible).length;

  return (
    <section
      aria-label="Master Audio Player and Section Loop Controls"
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4"
    >
      {/* Primary Transport Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Play/Pause Current */}
          <button
            type="button"
            onClick={onTogglePlayPause}
            aria-label={isPlaying ? "Pause Audio" : "Resume Audio"}
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* Dedicated Play Full Audio (Start to Finish) Button */}
          <button
            type="button"
            onClick={onPlayFullAudio}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Full Audio (Start to Finish)</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
              aria-label="Rewind 5 seconds"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Back 5s"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSeek(Math.min(safeDuration, currentTime + 5))}
              aria-label="Forward 5 seconds"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Forward 5s"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Time Readout & Speed Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="font-mono-tabular text-sm font-medium text-slate-700">
            <span>{formatTimestamp(currentTime, true)}</span>
            <span className="mx-1.5 text-slate-400">/</span>
            <span className="text-slate-500">{formatTimestamp(safeDuration)}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {[0.85, 1.0, 1.15, 1.25].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => onChangePlaybackRate(rate)}
                className={`px-2.5 py-1 text-xs font-mono-tabular font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  Math.abs(playbackRate - rate) < 0.01
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {!isUsingCustomAudio && (
            <button
              type="button"
              onClick={onSynthesizeAiVoices}
              disabled={isSynthesizingTts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Generate studio multi-speaker neural WAV audio via Gemini TTS"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>{isSynthesizingTts ? "Generating Studio Voice..." : "HD Neural Voice"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Timeline Scrubber with Line Markers & Loop Highlight */}
      <div className="space-y-1.5">
        <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center">
          {/* Active Loop Section Shading */}
          {loop.enabled && loop.mode !== "none" && (
            <div
              className="absolute top-0 bottom-0 bg-amber-200/60 border-x-2 border-amber-500 pointer-events-none"
              style={{
                left: `${loopLeftPercent}%`,
                width: `${loopWidthPercent}%`,
              }}
            />
          )}

          {/* Line Division Markers */}
          {lines.map((line, index) => {
            const leftPct = (line.startTime / safeDuration) * 100;
            return (
              <div
                key={line.id}
                style={{ left: `${leftPct}%` }}
                className="absolute top-0 bottom-0 border-l border-slate-300/70 pointer-events-none flex items-end pb-0.5 pl-1"
              >
                <span className="text-[10px] font-mono-tabular text-slate-400 select-none">
                  L{index + 1}
                </span>
              </div>
            );
          })}

          {/* Progress Fill */}
          <div
            className="h-full bg-sky-500/25 pointer-events-none transition-none"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Range Input Scrubber */}
          <input
            type="range"
            aria-label="Audio timeline scrubber"
            min={0}
            max={safeDuration}
            step={0.1}
            value={Math.min(safeDuration, currentTime)}
            onChange={(e) => onSeek( parseFloat(e.target.value) )}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Section Repeat (A–B Loop) & Blind Listening Drill Bar */}
      <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        {/* Left: A–B Section Repeat Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Repeat className="w-4 h-4 text-amber-600" />
            <span>Section Repeat (A–B):</span>
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span>From</span>
            <select
              aria-label="Loop start line"
              value={loop.startLineIndex}
              onChange={(e) => {
                const newStart = Number(e.target.value);
                const newEnd = Math.max(newStart, loop.endLineIndex);
                onUpdateLoopRange(newStart, newEnd, loop.enabled, loop.autoHideOnStart);
              }}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-medium text-slate-800"
            >
              {lines.map((l, idx) => (
                <option key={l.id} value={idx}>
                  Line {idx + 1} ({formatTimestamp(l.startTime)})
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span>To</span>
            <select
              aria-label="Loop end line"
              value={loop.endLineIndex}
              onChange={(e) => {
                const newEnd = Number(e.target.value);
                const newStart = Math.min(loop.startLineIndex, newEnd);
                onUpdateLoopRange(newStart, newEnd, loop.enabled, loop.autoHideOnStart);
              }}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-medium text-slate-800"
            >
              {lines.map((l, idx) => (
                <option key={l.id} value={idx}>
                  Line {idx + 1} ({formatTimestamp(l.endTime)})
                </option>
              ))}
            </select>
          </label>

          {/* Play Section Repeatedly (Hide Transcript First) */}
          <button
            type="button"
            onClick={() =>
              onUpdateLoopRange(loop.startLineIndex, loop.endLineIndex, true, true)
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              loop.enabled && loop.autoHideOnStart
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop Section &amp; Hide Transcript</span>
          </button>

          {/* Standard Loop Toggle */}
          {loop.enabled ? (
            <button
              type="button"
              onClick={onStopLoop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Stop Loop (Cycle #{loop.repeatCount + 1})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                onUpdateLoopRange(loop.startLineIndex, loop.endLineIndex, true, false)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop Section</span>
            </button>
          )}
        </div>

        {/* Right: Global Transcript Visibility & Masking Style */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-mono-tabular">
            Visible: {visibleLinesCount}/{lines.length}
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>

          <button
            type="button"
            onClick={() => onSetAllVisibility(false)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Hide All Lines</span>
          </button>

          <button
            type="button"
            onClick={() => onSetAllVisibility(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span>Show All Lines</span>
          </button>

          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => onChangeMaskingStyle("full_mask")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                maskingStyle === "full_mask"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Full Hide
            </button>
            <button
              type="button"
              onClick={() => onChangeMaskingStyle("cloze_keywords")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                maskingStyle === "cloze_keywords"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Keyword Cloze
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
