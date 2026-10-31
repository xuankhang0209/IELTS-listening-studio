import React from "react";
import { Play, Pause, Repeat, Eye, EyeOff, Lightbulb } from "lucide-react";
import { MaskingStyle, TranscriptLine } from "../types/ielts";
import { formatTimestamp, renderClozeText } from "../utils/listeningLogic";

interface TranscriptLineCardProps {
  line: TranscriptLine;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isLoopingThisLine: boolean;
  isInSectionLoop: boolean;
  maskingStyle: MaskingStyle;
  showTeachingNotes: boolean;
  onPlayLineOnce: (index: number) => void;
  onLoopSingleLine: (index: number, hideTranscriptFirst: boolean) => void;
  onToggleLineVisibility: (lineId: string) => void;
  onSetLoopBoundary: (index: number, boundary: "start" | "end") => void;
}

export const TranscriptLineCard: React.FC<TranscriptLineCardProps> = ({
  line,
  index,
  isActive,
  isPlaying,
  isLoopingThisLine,
  isInSectionLoop,
  maskingStyle,
  showTeachingNotes,
  onPlayLineOnce,
  onLoopSingleLine,
  onToggleLineVisibility,
  onSetLoopBoundary,
}) => {
  const lineNum = index + 1;

  return (
    <article
      data-testid={`transcript-line-${lineNum}`}
      className={`rounded-xl border p-4 transition-colors ${
        isActive
          ? "bg-sky-50/70 border-sky-400 shadow-2xs"
          : isInSectionLoop
          ? "bg-amber-50/35 border-amber-300"
          : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Left Action Column: Play Line & Loop Line Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {/* Play This Line Button */}
          <button
            type="button"
            onClick={() => onPlayLineOnce(index)}
            aria-label={`Play line ${lineNum}`}
            title={`Play Line ${lineNum} (${formatTimestamp(line.startTime)} – ${formatTimestamp(line.endTime)})`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isActive && isPlaying && !isLoopingThisLine
                ? "bg-sky-600 text-white"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {isActive && isPlaying && !isLoopingThisLine ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Play Line {lineNum}</span>
          </button>

          {/* Repeat This Line Without Showing Transcript Button */}
          <button
            type="button"
            onClick={() => onLoopSingleLine(index, !line.isTranscriptVisible)}
            aria-label={`Repeat line ${lineNum}`}
            title="Play this line repeatedly (loop)"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isLoopingThisLine
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{isLoopingThisLine ? "Looping" : "Repeat"}</span>
          </button>
        </div>

        {/* Center Content Column: Speaker, Timestamps & Transcript / Masked State */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Metadata Row (Zero-Pill Discipline: clean unboxed text with · separators) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{line.speaker}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {formatTimestamp(line.startTime)} – {formatTimestamp(line.endTime)}
              </span>
              {line.linkedQuestionNumber && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-sky-700">
                    Evidence for Q{line.linkedQuestionNumber}
                  </span>
                </>
              )}
              {isInSectionLoop && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-amber-800">In Active A–B Loop</span>
                </>
              )}
            </div>

            {/* Per-Line Controls: Set A/B & Hide/Show Transcript */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSetLoopBoundary(index, "start")}
                className="px-2 py-1 text-[11px] font-mono-tabular text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Set as Section Loop Start [A]"
              >
                Set [A]
              </button>
              <button
                type="button"
                onClick={() => onSetLoopBoundary(index, "end")}
                className="px-2 py-1 text-[11px] font-mono-tabular text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Set as Section Loop End [B]"
              >
                Set [B]
              </button>

              {/* Show / Hide Transcript Button for this Line */}
              <button
                type="button"
                onClick={() => onToggleLineVisibility(line.id)}
                aria-label={
                  line.isTranscriptVisible
                    ? `Hide transcript for line ${lineNum}`
                    : `Show transcript for line ${lineNum}`
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  line.isTranscriptVisible
                    ? "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                }`}
              >
                {line.isTranscriptVisible ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hide Line</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-sky-600" />
                    <span>Show Line</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Transcript Text or Blind-Listening Mask */}
          {line.isTranscriptVisible ? (
            <p className="text-[15px] leading-relaxed text-slate-900">
              {line.text}
            </p>
          ) : maskingStyle === "cloze_keywords" ? (
            <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex items-center justify-between gap-4">
              <p className="text-[15px] leading-relaxed text-slate-700 font-medium">
                {renderClozeText(line.text, line.keyVocabulary)}
              </p>
              <button
                type="button"
                onClick={() => onToggleLineVisibility(line.id)}
                className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Reveal Keywords
              </button>
            </div>
          ) : (
            <div className="px-3.5 py-2.5 rounded-lg bg-slate-100/90 border border-dashed border-slate-300 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                <span className="font-medium text-slate-700">
                  Transcript Hidden (Blind Listening)
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-slate-500">
                  {line.text.split(/\s+/).length} words · {Math.round(line.endTime - line.startTime)}s
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onLoopSingleLine(index, true)}
                  className="text-xs font-medium text-amber-800 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Loop Audio Blindly
                </button>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onToggleLineVisibility(line.id)}
                  className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Reveal Transcript
                </button>
              </div>
            </div>
          )}

          {/* Teacher Distractor & Exam Clue Callout */}
          {showTeachingNotes && line.teachingNote && line.isTranscriptVisible && (
            <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold text-slate-800">IELTS Teaching Note:</strong>{" "}
                {line.teachingNote}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
