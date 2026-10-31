export interface TranscriptLine {
  id: string;
  speaker: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  isTranscriptVisible: boolean;
  keyVocabulary?: string[];
  teachingNote?: string;
  linkedQuestionNumber?: number;
}

export type QuestionType = "gap_fill" | "multiple_choice";

export interface IeltsQuestion {
  id: string;
  questionNumber: number;
  type: QuestionType;
  prompt: string; // For gap_fill, uses [BLANK] where the input goes
  options?: string[];
  acceptableAnswers: string[];
  evidenceLineIndex: number; // 0-based index into TranscriptLine[]
  explanation?: string;
}

export interface IeltsPassage {
  id: string;
  sectionTitle: string;
  partLabel: string;
  cefrBand: string;
  totalDuration: number;
  audioUrl?: string; // Custom uploaded audio or generated WAV
  lines: TranscriptLine[];
  worksheetTitle: string;
  instructionText: string;
  questions: IeltsQuestion[];
}

export interface LoopConfig {
  enabled: boolean;
  mode: "none" | "single_line" | "section_range";
  startLineIndex: number;
  endLineIndex: number;
  startTime: number;
  endTime: number;
  repeatCount: number; // how many times this loop has played
  autoHideOnStart: boolean; // hide transcript while looping so students listen blindly first
}

export type MaskingStyle = "full_mask" | "cloze_keywords";
