import { IeltsQuestion, LoopConfig, TranscriptLine } from "../types/ielts";

/**
 * Formats seconds into MM:SS.d or MM:SS format with tabular alignment.
 */
export function formatTimestamp(seconds: number, includeTenths = false): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe - Math.floor(safe)) * 10);
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return includeTenths ? `${mm}:${ss}.${tenths}` : `${mm}:${ss}`;
}

/**
 * Finds the active transcript line ID for a given playback time in seconds.
 */
export function findActiveLineId(lines: TranscriptLine[], currentTime: number): string | null {
  for (const line of lines) {
    if (currentTime >= line.startTime && currentTime < line.endTime) {
      return line.id;
    }
  }
  return null;
}

/**
 * Computes the startTime and endTime of a selected line range (A to B).
 */
export function computeSectionRange(
  lines: TranscriptLine[],
  startIdx: number,
  endIdx: number
): { startIndex: number; endIndex: number; startTime: number; endTime: number } {
  if (lines.length === 0) {
    return { startIndex: 0, endIndex: 0, startTime: 0, endTime: 0 };
  }
  const clampedA = Math.max(0, Math.min(lines.length - 1, Math.min(startIdx, endIdx)));
  const clampedB = Math.max(0, Math.min(lines.length - 1, Math.max(startIdx, endIdx)));
  return {
    startIndex: clampedA,
    endIndex: clampedB,
    startTime: lines[clampedA].startTime,
    endTime: lines[clampedB].endTime,
  };
}

/**
 * Determines whether playback at `currentTime` has reached the end of an active loop
 * and should jump back to `loop.startTime` (or pause if not looping).
 */
export function evaluatePlaybackBoundary(
  currentTime: number,
  loop: LoopConfig,
  singlePlayEndTime: number | null
): { action: "continue" | "jump_to_loop_start" | "stop_single_line"; targetTime: number } {
  if (loop.enabled && loop.mode !== "none" && loop.endTime > loop.startTime) {
    if (currentTime >= loop.endTime - 0.04) {
      return { action: "jump_to_loop_start", targetTime: loop.startTime };
    }
  }
  if (!loop.enabled && singlePlayEndTime !== null && currentTime >= singlePlayEndTime - 0.04) {
    return { action: "stop_single_line", targetTime: singlePlayEndTime };
  }
  return { action: "continue", targetTime: currentTime };
}

/**
 * Toggles transcript visibility for a single line ID.
 */
export function toggleLineVisibility(lines: TranscriptLine[], lineId: string): TranscriptLine[] {
  return lines.map((line) =>
    line.id === lineId ? { ...line, isTranscriptVisible: !line.isTranscriptVisible } : line
  );
}

/**
 * Sets transcript visibility for a range of lines (or all lines).
 */
export function setLinesVisibility(
  lines: TranscriptLine[],
  visible: boolean,
  startIdx = 0,
  endIdx = lines.length - 1
): TranscriptLine[] {
  const minIdx = Math.min(startIdx, endIdx);
  const maxIdx = Math.max(startIdx, endIdx);
  return lines.map((line, idx) =>
    idx >= minIdx && idx <= maxIdx ? { ...line, isTranscriptVisible: visible } : line
  );
}

/**
 * Normalizes an IELTS Listening student response for fair comparison.
 * Strips extra punctuation, normalizes case, and removes leading articles ("a", "an", "the")
 * so both "the library" and "library" match when appropriate.
 */
export function normalizeIeltsAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.,;!?'"()]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
}

/**
 * Checks whether a student's response matches any of the acceptable answers for an IELTS question.
 */
export function checkIeltsAnswer(userAnswer: string, acceptableAnswers: string[]): boolean {
  const cleanedUser = normalizeIeltsAnswer(userAnswer);
  if (!cleanedUser) return false;

  const rawUserTrimmed = userAnswer.trim().toLowerCase().replace(/\s+/g, " ");

  return acceptableAnswers.some((ans) => {
    const cleanedAns = normalizeIeltsAnswer(ans);
    const rawAnsTrimmed = ans.trim().toLowerCase().replace(/\s+/g, " ");
    return cleanedUser === cleanedAns || rawUserTrimmed === rawAnsTrimmed;
  });
}

/**
 * Grades a full worksheet of IELTS questions and returns summary metrics.
 */
export function gradeWorksheet(
  questions: IeltsQuestion[],
  userAnswers: Record<string, string>
): {
  correctCount: number;
  totalCount: number;
  percentage: number;
  estimatedIeltsBand: string;
  resultsByQuestionId: Record<string, boolean>;
} {
  const resultsByQuestionId: Record<string, boolean> = {};
  let correctCount = 0;

  for (const q of questions) {
    const given = userAnswers[q.id] || "";
    const isCorrect = checkIeltsAnswer(given, q.acceptableAnswers);
    resultsByQuestionId[q.id] = isCorrect;
    if (isCorrect) correctCount++;
  }

  const totalCount = questions.length;
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  let estimatedIeltsBand = "5.0";
  if (percentage >= 90) estimatedIeltsBand = "8.5–9.0";
  else if (percentage >= 80) estimatedIeltsBand = "7.5–8.0";
  else if (percentage >= 65) estimatedIeltsBand = "6.5–7.0";
  else if (percentage >= 50) estimatedIeltsBand = "5.5–6.0";
  else estimatedIeltsBand = "4.5–5.0";

  return {
    correctCount,
    totalCount,
    percentage,
    estimatedIeltsBand,
    resultsByQuestionId,
  };
}

/**
 * Replaces key vocabulary words in a transcript line with cloze blanks `[ _____ ]`
 * when masking style is set to `cloze_keywords`.
 */
export function renderClozeText(text: string, keyVocabulary: string[] = []): string {
  if (!keyVocabulary || keyVocabulary.length === 0) {
    return text;
  }
  let result = text;
  for (const word of keyVocabulary) {
    if (!word.trim()) continue;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(regex, " [ ______ ] ");
  }
  return result.replace(/\s+/g, " ").trim();
}
