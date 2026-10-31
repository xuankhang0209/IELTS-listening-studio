import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTimestamp,
  findActiveLineId,
  computeSectionRange,
  evaluatePlaybackBoundary,
  toggleLineVisibility,
  setLinesVisibility,
  normalizeIeltsAnswer,
  checkIeltsAnswer,
  gradeWorksheet,
  renderClozeText,
} from "./listeningLogic";
import { TranscriptLine, IeltsQuestion, LoopConfig } from "../types/ielts";

const sampleLines: TranscriptLine[] = [
  {
    id: "l1",
    speaker: "Receptionist",
    startTime: 0,
    endTime: 5.5,
    text: "Good morning, Greenvale Sports Centre. How can I help you?",
    isTranscriptVisible: true,
    keyVocabulary: ["Greenvale", "Sports"],
  },
  {
    id: "l2",
    speaker: "Caller",
    startTime: 5.5,
    endTime: 12.0,
    text: "Hello, I would like to inquire about annual swimming memberships.",
    isTranscriptVisible: true,
    keyVocabulary: ["annual", "swimming"],
  },
  {
    id: "l3",
    speaker: "Receptionist",
    startTime: 12.0,
    endTime: 19.5,
    text: "Certainly. Could I take your postcode first? Is itBD9 4TJ?",
    isTranscriptVisible: false,
    keyVocabulary: ["BD9 4TJ"],
  },
];

test("formatTimestamp formats minutes and seconds accurately", () => {
  assert.equal(formatTimestamp(0), "00:00");
  assert.equal(formatTimestamp(65), "01:05");
  assert.equal(formatTimestamp(12.4, true), "00:12.4");
});

test("findActiveLineId identifies the current line based on playback time", () => {
  assert.equal(findActiveLineId(sampleLines, 2.3), "l1");
  assert.equal(findActiveLineId(sampleLines, 5.5), "l2");
  assert.equal(findActiveLineId(sampleLines, 15.0), "l3");
  assert.equal(findActiveLineId(sampleLines, 25.0), null);
});

test("computeSectionRange handles reversed indices and returns exact start/end times", () => {
  const range = computeSectionRange(sampleLines, 2, 1);
  assert.equal(range.startIndex, 1);
  assert.equal(range.endIndex, 2);
  assert.equal(range.startTime, 5.5);
  assert.equal(range.endTime, 19.5);
});

test("evaluatePlaybackBoundary jumps back to loop start when section loop reaches end", () => {
  const loop: LoopConfig = {
    enabled: true,
    mode: "section_range",
    startLineIndex: 0,
    endLineIndex: 1,
    startTime: 0,
    endTime: 12.0,
    repeatCount: 1,
    autoHideOnStart: true,
  };

  const mid = evaluatePlaybackBoundary(6.0, loop, null);
  assert.equal(mid.action, "continue");

  const atEnd = evaluatePlaybackBoundary(11.98, loop, null);
  assert.equal(atEnd.action, "jump_to_loop_start");
  assert.equal(atEnd.targetTime, 0);
});

test("evaluatePlaybackBoundary stops when single line playback finishes without loop", () => {
  const disabledLoop: LoopConfig = {
    enabled: false,
    mode: "none",
    startLineIndex: 0,
    endLineIndex: 0,
    startTime: 0,
    endTime: 0,
    repeatCount: 0,
    autoHideOnStart: false,
  };

  const res = evaluatePlaybackBoundary(5.48, disabledLoop, 5.5);
  assert.equal(res.action, "stop_single_line");
  assert.equal(res.targetTime, 5.5);
});

test("toggleLineVisibility and setLinesVisibility update line visibility state", () => {
  const toggled = toggleLineVisibility(sampleLines, "l1");
  assert.equal(toggled[0].isTranscriptVisible, false);
  assert.equal(toggled[1].isTranscriptVisible, true);

  const allHidden = setLinesVisibility(sampleLines, false);
  assert.equal(allHidden.every((l) => !l.isTranscriptVisible), true);

  const rangeShown = setLinesVisibility(allHidden, true, 0, 1);
  assert.equal(rangeShown[0].isTranscriptVisible, true);
  assert.equal(rangeShown[1].isTranscriptVisible, true);
  assert.equal(rangeShown[2].isTranscriptVisible, false);
});

test("checkIeltsAnswer and gradeWorksheet support flexible IELTS answer matching", () => {
  assert.equal( normalizeIeltsAnswer("  The Chesterton Road. "), "chesterton road");
  assert.equal(checkIeltsAnswer("Chesterton", ["Chesterton", "the Chesterton"]), true);
  assert.equal(checkIeltsAnswer("85", ["85", "eighty-five", "£85"]), true);
  assert.equal(checkIeltsAnswer("wrong", ["85"]), false);

  const questions: IeltsQuestion[] = [
    {
      id: "q1",
      questionNumber: 1,
      type: "gap_fill",
      prompt: "Postcode: [BLANK]",
      acceptableAnswers: ["BD9 4TJ", "bd94tj"],
      evidenceLineIndex: 2,
    },
    {
      id: "q2",
      questionNumber: 2,
      type: "multiple_choice",
      prompt: "Membership type:",
      options: ["A. Monthly", "B. Annual", "C. Weekend"],
      acceptableAnswers: ["B", "B. Annual", "Annual"],
      evidenceLineIndex: 1,
    },
  ];

  const report = gradeWorksheet(questions, { q1: "bd9 4tj", q2: "B" });
  assert.equal(report.correctCount, 2);
  assert.equal(report.percentage, 100);
  assert.equal(report.estimatedIeltsBand, "8.5–9.0");
});

test("renderClozeText masks target vocabulary with blanks", () => {
  const cloze = renderClozeText(
    "Hello, I would like to inquire about annual swimming memberships.",
    ["annual", "swimming"]
  );
  assert.equal(cloze.includes("[ ______ ]"), true);
  assert.equal(cloze.includes("annual"), false);
});
