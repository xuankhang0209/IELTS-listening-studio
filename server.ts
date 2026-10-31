import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body limit for audio & screenshot base64 payloads
app.use(express.json({ limit: "50mb" }));

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// POST /api/transcribe
// Accepts base64 audio and returns structured IELTS Listening transcript lines with timestamps, speakers, and teaching notes
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/mp3", durationSeconds = 60, title = "Uploaded IELTS Audio" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Missing audioBase64 in request body." });
    }

    const ai = getGenAIClient();

    // Step 1: Use gemini-3.5-transcribe to get accurate verbatim transcription
    const rawTranscriptionResponse = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: "Transcribe this IELTS listening audio verbatim, preserving speaker turns and numbers/spellings accurately.",
          },
        ],
      },
    });

    const verbatimText = rawTranscriptionResponse.text || "";

    // Step 2: Structure the transcription into timestamped lines with gemini-3.8-flash
    const structuredResponse = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: `You are an expert IELTS Listening teacher. Given this audio (total duration approximately ${Math.round(
              Number(durationSeconds) || 60
            )} seconds) and its verbatim transcript:\n\n${verbatimText}\n\nBreak this audio into natural sentence-by-sentence or turn-by-turn transcript lines for classroom teaching. Provide accurate startTime and endTime in seconds (within 0 to ${Math.round(
              Number(durationSeconds) || 60
            )}), speaker name, text, keyVocabulary (1-2 key words in the line suitable for cloze listening), and optional teachingNote (e.g. pointing out a distractor, self-correction, or answer cue).`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sectionTitle: {
              type: Type.STRING,
              description: "Suggested title for this IELTS Listening passage.",
            },
            partLabel: {
              type: Type.STRING,
              description: "IELTS Part label, e.g., Part 1: Everyday Conversation",
            },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING },
                  startTime: { type: Type.NUMBER },
                  endTime: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  keyVocabulary: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  teachingNote: { type: Type.STRING },
                },
                required: ["speaker", "startTime", "endTime", "text"],
              },
            },
          },
          required: ["sectionTitle", "partLabel", "lines"],
        },
      },
    });

    const parsed = JSON.parse((structuredResponse.text ?? "{}").trim());
    return res.json({
      sectionTitle: parsed.sectionTitle || title,
      partLabel: parsed.partLabel || "Custom Audio Passage",
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to transcribe audio with Gemini API.",
    });
  }
});

// POST /api/extract-questions
// Accepts a screenshot image (base64) of an IELTS Listening question sheet and extracts structured interactive questions
app.post("/api/extract-questions", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png", transcriptContext = "" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: `Extract all IELTS Listening questions from this screenshot into a structured interactive worksheet.
If there is a word limit instruction (e.g., "ONE WORD AND/OR A NUMBER" or "NO MORE THAN TWO WORDS"), capture it in instructionText.
For gap-fill / form completion / note completion questions, include [BLANK] in the prompt where the student types the answer.
If transcript context is provided below, also infer the correct acceptableAnswers and the matching lineNumber (1-indexed) where the answer is heard:
Transcript Context:
${transcriptContext || "No transcript provided; infer reasonable IELTS answer keys if visible or leave acceptableAnswers with the best expected answer."}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            worksheetTitle: {
              type: Type.STRING,
              description: "Title of the question set extracted from the screenshot.",
            },
            instructionText: {
              type: Type.STRING,
              description: "Word/number limit instruction, e.g. Write ONE WORD AND/OR A NUMBER for each answer.",
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: {
                    type: Type.INTEGER,
                    description: "Question number as shown on the screenshot (e.g., 1, 2, 3).",
                  },
                  type: {
                    type: Type.STRING,
                    description: "Either 'gap_fill' or 'multiple_choice'",
                  },
                  prompt: {
                    type: Type.STRING,
                    description: "Question stem or note line. Use [BLANK] to represent the blank space for gap_fill.",
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Options A, B, C if multiple_choice; empty array for gap_fill.",
                  },
                  acceptableAnswers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Correct answer(s) for grading.",
                  },
                  evidenceLineIndex: {
                    type: Type.INTEGER,
                    description: "0-based index of the transcript line that answers this question, or -1 if unknown.",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Brief explanation of why this answer is correct and any distractor to watch out for.",
                  },
                },
                required: ["questionNumber", "type", "prompt", "acceptableAnswers"],
              },
            },
          },
          required: ["worksheetTitle", "instructionText", "questions"],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());
    return res.json(parsed);
  } catch (error: any) {
    console.error("Question extraction error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to extract questions from screenshot.",
    });
  }
});

// POST /api/tts-dialogue
// Synthesizes multi-speaker IELTS audio from script lines using gemini-3.8-flash-tts
app.post("/api/tts-dialogue", async (req, res) => {
  try {
    const { lines } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: "Provide at least one dialogue line." });
    }

    const ai = getGenAIClient();
    const uniqueSpeakers = Array.from(new Set(lines.map((l: any) => String(l.speaker || "Speaker 1")))).slice(0, 2);
    if (uniqueSpeakers.length === 1) {
      uniqueSpeakers.push("Speaker 2");
    }

    const parts = lines.map((l: any) => {
      const spk = uniqueSpeakers.includes(l.speaker) ? l.speaker : uniqueSpeakers[0];
      return {
        text: `${spk}: ${l.text}`,
        speechMetadata: {
          speaker: spk,
          style: "Clear British/International IELTS exam recording pace",
        },
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-tts",
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: uniqueSpeakers[0],
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" },
                },
              },
              {
                speaker: uniqueSpeakers[1],
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Puck" },
                },
              },
            ],
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "No audio returned from TTS model." });
    }

    return res.json({
      audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (error: any) {
    console.error("TTS dialogue error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate speech audio.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LexisListen server running at http://localhost:${PORT}`);
  });
}

startServer();
