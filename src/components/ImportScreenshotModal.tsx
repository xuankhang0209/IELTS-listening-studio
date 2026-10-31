import React, { useState } from "react";
import { X, Upload, Sparkles, Check, FileImage, AlertCircle } from "lucide-react";
import { IeltsQuestion, TranscriptLine } from "../types/ielts";
import {
  SAMPLE_SCREENSHOT_TEMPLATES,
  SampleScreenshotTemplate,
} from "../data/samplePassages";

interface ImportScreenshotModalProps {
  isOpen: boolean;
  lines: TranscriptLine[];
  onClose: () => void;
  onImportQuestions: (payload: {
    worksheetTitle: string;
    instructionText: string;
    questions: IeltsQuestion[];
  }) => void;
}

export const ImportScreenshotModal: React.FC<ImportScreenshotModalProps> = ({
  isOpen,
  lines,
  onClose,
  onImportQuestions,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<SampleScreenshotTemplate>(
    SAMPLE_SCREENSHOT_TEMPLATES[0]
  );
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string>("image/png");
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setUploadedMimeType(file.type || "image/png");

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setUploadedPreviewUrl(dataUrl);
      const base64Part = dataUrl.split(",")[1] || "";
      setUploadedBase64(base64Part);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractFromUploadedImage = async () => {
    if (!uploadedBase64) return;
    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const transcriptContext = lines
        .map((l, idx) => `Line ${idx + 1} (${l.speaker}): ${l.text}`)
        .join("\n");

      const response = await fetch("/api/extract-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: uploadedBase64,
          mimeType: uploadedMimeType,
          transcriptContext,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to extract questions from screenshot.");
      }

      const mappedQuestions: IeltsQuestion[] = (data.questions || []).map(
        (q: any, idx: number) => ({
          id: `ocr-q-${Date.now()}-${idx}`,
          questionNumber: Number(q.questionNumber) || idx + 1,
          type: q.type === "multiple_choice" ? "multiple_choice" : "gap_fill",
          prompt: String(q.prompt || `Question ${idx + 1}: [BLANK]`),
          options: Array.isArray(q.options) ? q.options : [],
          acceptableAnswers:
            Array.isArray(q.acceptableAnswers) && q.acceptableAnswers.length > 0
              ? q.acceptableAnswers
              : ["answer"],
          evidenceLineIndex:
            typeof q.evidenceLineIndex === "number" ? q.evidenceLineIndex : 0,
          explanation: q.explanation || "",
        })
      );

      onImportQuestions({
        worksheetTitle: data.worksheetTitle || "Imported IELTS Worksheet",
        instructionText:
          data.instructionText ||
          "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
        questions: mappedQuestions,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not extract questions from image.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImportSampleTemplate = (tpl: SampleScreenshotTemplate) => {
    const mapped: IeltsQuestion[] = tpl.extractedPayload.questions.map((q, idx) => ({
      id: `tpl-${tpl.id}-q${idx + 1}`,
      questionNumber: q.questionNumber,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      acceptableAnswers: q.acceptableAnswers,
      evidenceLineIndex: q.evidenceLineIndex,
      explanation: q.explanation,
    }));

    onImportQuestions({
      worksheetTitle: tpl.extractedPayload.worksheetTitle,
      instructionText: tpl.extractedPayload.instructionText,
      questions: mapped,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="screenshot-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-6 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 id="screenshot-modal-title" className="text-xl font-bold text-slate-900">
              Import IELTS Questions from Screenshot
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Upload a screenshot of any IELTS Listening question page (Form Completion, Note Completion, or Multiple Choice) to turn it into an interactive worksheet linked to your transcript.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close screenshot import modal"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option 1: Upload Custom Screenshot Image */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            01. Upload Screenshot Image (PNG, JPG, WebP)
          </h3>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-6 bg-slate-50/70 cursor-pointer transition-colors">
            <Upload className="w-7 h-7 text-sky-600 mb-2" />
            <span className="text-sm font-semibold text-slate-800">
              Click to select an IELTS question screenshot
            </span>
            <span className="text-xs text-slate-500 mt-0.5">
              Automatically detects gap-fill blanks, word limits, and multiple-choice options
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {uploadedPreviewUrl && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Uploaded Screenshot Preview
                </span>
                <button
                  type="button"
                  onClick={handleExtractFromUploadedImage}
                  disabled={isExtracting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isExtracting
                      ? "Extracting Questions from Screenshot..."
                      : "Extract Questions with AI OCR"}
                  </span>
                </button>
              </div>
              <img
                src={uploadedPreviewUrl}
                alt="Uploaded IELTS worksheet screenshot preview"
                referrerPolicy="no-referrer"
                className="max-h-56 rounded-lg border border-slate-200 object-contain mx-auto bg-white"
              />
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Option 2: Instant Sample IELTS Question Screenshots for Classroom Demo */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              02. Or Test Instantly with Sample IELTS Question Screenshots
            </h3>
            <span className="text-xs text-slate-500">
              Select a test paper scan below to import
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SAMPLE_SCREENSHOT_TEMPLATES.map((tpl) => {
              const isSelected = selectedTemplate.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer space-y-2 ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/40"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{tpl.badgeText}</span>
                    {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                  </div>
                  <p className="text-xs font-medium text-slate-700">{tpl.subtitle}</p>
                  <img
                    src={tpl.svgDataUrl}
                    alt={tpl.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-32 object-cover object-top rounded border border-slate-200 bg-white"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImportSampleTemplate(tpl);
                    }}
                    className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    <span>Import This Screenshot Worksheet</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
