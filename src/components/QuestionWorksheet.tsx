import React from "react";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Eye,
  Plus,
} from "lucide-react";
import { IeltsQuestion, TranscriptLine } from "../types/ielts";
import { gradeWorksheet } from "../utils/listeningLogic";

interface QuestionWorksheetProps {
  worksheetTitle: string;
  instructionText: string;
  questions: IeltsQuestion[];
  lines: TranscriptLine[];
  userAnswers: Record<string, string>;
  isSubmitted: boolean;
  showAnswerKeys: boolean;
  onChangeAnswer: (questionId: string, value: string) => void;
  onCheckAnswers: () => void;
  onResetWorksheet: () => void;
  onToggleAnswerKeys: () => void;
  onPlayEvidenceLine: (lineIndex: number) => void;
  onOpenScreenshotModal: () => void;
  onAddManualQuestion: () => void;
}

export const QuestionWorksheet: React.FC<QuestionWorksheetProps> = ({
  worksheetTitle,
  instructionText,
  questions,
  lines,
  userAnswers,
  isSubmitted,
  showAnswerKeys,
  onChangeAnswer,
  onCheckAnswers,
  onResetWorksheet,
  onToggleAnswerKeys,
  onPlayEvidenceLine,
  onOpenScreenshotModal,
  onAddManualQuestion,
}) => {
  const report = gradeWorksheet(questions, userAnswers);

  const renderPromptWithInput = (q: IeltsQuestion) => {
    const val = userAnswers[q.id] || "";
    const isCorrect = report.resultsByQuestionId[q.id];

    if (q.type === "multiple_choice" && q.options && q.options.length > 0) {
      return (
        <div className="space-y-2.5">
          <p className="text-sm font-medium text-slate-900">{q.prompt}</p>
          <div className="space-y-1.5">
            {q.options.map((opt) => {
              const letter = opt.trim().charAt(0);
              const selected = val === letter || val === opt;
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selected
                      ? "bg-sky-50 border-sky-400 text-slate-900 font-medium"
                      : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    value={letter}
                    checked={selected}
                    onChange={() => onChangeAnswer(q.id, letter)}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    // Gap-fill question with [BLANK]
    const parts = q.prompt.split("[BLANK]");
    if (parts.length === 1) {
      return (
        <div className="space-y-2">
          <label htmlFor={`input-${q.id}`} className="block text-sm text-slate-800">
            {q.prompt}
          </label>
          <input
            id={`input-${q.id}`}
            type="text"
            value={val}
            onChange={(e) => onChangeAnswer(q.id, e.target.value)}
            placeholder="Type answer..."
            className={`w-full max-w-xs px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
              isSubmitted
                ? isCorrect
                  ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                  : "bg-red-50 border-red-400 text-red-950"
                : "bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:outline-none"
            }`}
          />
        </div>
      );
    }

    return (
      <div className="text-sm leading-relaxed text-slate-800 flex flex-wrap items-center gap-1.5">
        <span>{parts[0]}</span>
        <input
          id={`input-${q.id}`}
          aria-label={`Question ${q.questionNumber} answer`}
          type="text"
          value={val}
          onChange={(e) => onChangeAnswer(q.id, e.target.value)}
          placeholder={`Q${q.questionNumber} answer...`}
          className={`inline-block w-44 px-2.5 py-1 text-sm rounded-md border font-medium transition-colors ${
            isSubmitted
              ? isCorrect
                ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                : "bg-red-50 border-red-400 text-red-950"
              : "bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:outline-none"
          }`}
        />
        <span>{parts.slice(1).join("")}</span>
      </div>
    );
  };

  return (
    <aside
      aria-label="IELTS Listening Question Worksheet"
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5"
    >
      {/* Header & Screenshot Import Action */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {worksheetTitle}
          </h2>
          <p className="text-xs font-mono-tabular font-semibold text-sky-700">
            {instructionText}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenScreenshotModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Import from Screenshot</span>
          </button>
          <button
            type="button"
            onClick={onAddManualQuestion}
            aria-label="Add custom question"
            title="Add question row manually"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Score Summary Banner when Submitted */}
      {isSubmitted && (
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-700 font-mono-tabular">
            <span className="font-bold text-slate-900 text-sm">
              Score: {report.correctCount} / {report.totalCount} ({report.percentage}%)
            </span>
            <span aria-hidden="true">·</span>
            <span>Est. IELTS Band: {report.estimatedIeltsBand}</span>
          </div>
          <button
            type="button"
            onClick={onResetWorksheet}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear &amp; Try Again</span>
          </button>
        </div>
      )}

      {/* Question Items List */}
      <div className="space-y-3.5">
        {questions.map((q) => {
          const isCorrect = report.resultsByQuestionId[q.id];
          const hasValidEvidence =
            q.evidenceLineIndex >= 0 && q.evidenceLineIndex < lines.length;

          return (
            <div
              key={q.id}
              className="p-3.5 rounded-lg border border-slate-200/90 bg-slate-50/40 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono-tabular font-bold text-slate-900">
                    Question {q.questionNumber}
                  </span>
                  {isSubmitted && (
                    <>
                      <span aria-hidden="true">·</span>
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Needs Review</span>
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Jump to / Play Audio Evidence Line */}
                {hasValidEvidence && (
                  <button
                    type="button"
                    onClick={() => onPlayEvidenceLine(q.evidenceLineIndex)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    title={`Play Line ${q.evidenceLineIndex + 1} where Q${q.questionNumber} is heard`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play Evidence (Line {q.evidenceLineIndex + 1})</span>
                  </button>
                )}
              </div>

              {renderPromptWithInput(q)}

              {/* Answer Key & Teacher Explanation when revealed or submitted */}
              {(showAnswerKeys || isSubmitted) && (
                <div className="pt-2 border-t border-slate-200/70 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-800">Answer Key: </span>
                    <span className="font-mono-tabular font-semibold text-emerald-700">
                      {q.acceptableAnswers.join(" / ")}
                    </span>
                  </div>
                  {q.explanation && <p className="text-slate-500">{q.explanation}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Worksheet Footer Controls */}
      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCheckAnswers}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Check Answers
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAnswerKeys}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>{showAnswerKeys ? "Hide Answer Keys" : "Teacher Answer Key"}</span>
          </button>

          <button
            type="button"
            onClick={onResetWorksheet}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Reset
          </button>
        </div>
      </div>
    </aside>
  );
};
