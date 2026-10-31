import { IeltsPassage } from "../types/ielts";

export interface SampleScreenshotTemplate {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  passageId: string;
  svgDataUrl: string;
  extractedPayload: {
    worksheetTitle: string;
    instructionText: string;
    questions: {
      questionNumber: number;
      type: "gap_fill" | "multiple_choice";
      prompt: string;
      options?: string[];
      acceptableAnswers: string[];
      evidenceLineIndex: number;
      explanation: string;
    }[];
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createWorksheetSvgDataUrl(title: string, instruction: string, lines: string[]): string {
  const escapedRows = lines
    .map(
      (line, idx) =>
        `<text x="40" y="${150 + idx * 36}" font-family="Plus Jakarta Sans, sans-serif" font-size="15" fill="#1e293b">${escapeXml(
          line
        )}</text>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="460" viewBox="0 0 760 460">
    <rect width="760" height="460" fill="#ffffff" rx="8" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="24" y="24" width="712" height="76" fill="#f8fafc" rx="6" stroke="#e2e8f0" stroke-width="1"/>
    <text x="40" y="54" font-family="Fraunces, Georgia, serif" font-size="20" font-weight="bold" fill="#0f172a">${escapeXml(title)}</text>
    <text x="40" y="82" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="bold" fill="#0284c7">${escapeXml(instruction)}</text>
    <line x1="24" y1="116" x2="736" y2="116" stroke="#e2e8f0" stroke-width="1.5"/>
    ${escapedRows}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PASSAGES: IeltsPassage[] = [
  {
    id: "passage-part-1",
    sectionTitle: "Greenvale Community Sports Centre Enquiry",
    partLabel: "IELTS Listening Part 1 · Everyday Consultation",
    cefrBand: "Band 6.5–8.0 Target",
    totalDuration: 48,
    lines: [
      {
        id: "p1-l1",
        speaker: "Receptionist",
        startTime: 0,
        endTime: 6,
        text: "Good morning, Greenvale Community Sports Centre, Chloe speaking. How may I help you today?",
        isTranscriptVisible: true,
        keyVocabulary: ["Greenvale", "Community"],
        teachingNote: "Warm-up orientation line. Introduces the setting and speaker name.",
      },
      {
        id: "p1-l2",
        speaker: "Marcus",
        startTime: 6,
        endTime: 12,
        text: "Hi Chloe. I recently moved into the neighbourhood and I'd like to register for a Gold Fitness membership.",
        isTranscriptVisible: true,
        keyVocabulary: ["Gold", "Fitness"],
        linkedQuestionNumber: 1,
        teachingNote: "Answer Q1 ('Gold'). Students often miss capitalized tier names.",
      },
      {
        id: "p1-l3",
        speaker: "Receptionist",
        startTime: 12,
        endTime: 19,
        text: "Welcome to the area! For the Gold package, it used to be ninety-five pounds per month, but we currently have a seasonal rate of seventy-eight pounds.",
        isTranscriptVisible: true,
        keyVocabulary: ["ninety-five", "seventy-eight"],
        linkedQuestionNumber: 2,
        teachingNote: "Classic IELTS numeric distractor: £95 is the old fee; £78 is the current monthly fee.",
      },
      {
        id: "p1-l4",
        speaker: "Marcus",
        startTime: 19,
        endTime: 25,
        text: "Seventy-eight pounds sounds reasonable. Does that include the indoor climbing wall and racket courts?",
        isTranscriptVisible: true,
        keyVocabulary: ["climbing", "racket"],
      },
      {
        id: "p1-l5",
        speaker: "Receptionist",
        startTime: 25,
        endTime: 32,
        text: "It includes all racket courts and the heated pool, plus a free initial assessment with a physiotherapist on your first Thursday.",
        isTranscriptVisible: true,
        keyVocabulary: ["physiotherapist", "Thursday"],
        linkedQuestionNumber: 3,
        teachingNote: "Answer Q3 ('physiotherapist'). Watch out for spelling of 'physiotherapist'.",
      },
      {
        id: "p1-l6",
        speaker: "Marcus",
        startTime: 32,
        endTime: 40,
        text: "That's great. Let me give you my address for the registration card—it's 42 Haberdasher Street, spelled H-A-B-E-R-D-A-S-H-E-R.",
        isTranscriptVisible: true,
        keyVocabulary: ["Haberdasher", "42"],
        linkedQuestionNumber: 4,
        teachingNote: "Answer Q4 ('Haberdasher'). Direct dictated spelling test typical of Part 1.",
      },
      {
        id: "p1-l7",
        speaker: "Receptionist",
        startTime: 40,
        endTime: 48,
        text: "Got that—42 Haberdasher Street. Lastly, please bring a utility bill or bank statement to reception when you collect your pass.",
        isTranscriptVisible: true,
        keyVocabulary: ["utility bill", "bank statement"],
        linkedQuestionNumber: 5,
        teachingNote: "Answer Q5 ('utility bill' or 'bank statement').",
      },
    ],
    worksheetTitle: "Questions 1–5: Sports Centre Registration Form",
    instructionText: "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    questions: [
      {
        id: "p1-q1",
        questionNumber: 1,
        type: "gap_fill",
        prompt: "Membership Tier Requested: [BLANK] Fitness Membership",
        acceptableAnswers: ["Gold", "gold"],
        evidenceLineIndex: 1,
        explanation: "Marcus states he wants to register for a 'Gold Fitness membership'.",
      },
      {
        id: "p1-q2",
        questionNumber: 2,
        type: "gap_fill",
        prompt: "Current Monthly Subscription Fee: £ [BLANK]",
        acceptableAnswers: ["78", "seventy-eight", "£78"],
        evidenceLineIndex: 2,
        explanation: "£95 is a distractor (past price). The current seasonal rate is £78.",
      },
      {
        id: "p1-q3",
        questionNumber: 3,
        type: "gap_fill",
        prompt: "Complimentary session included with a: [BLANK]",
        acceptableAnswers: ["physiotherapist"],
        evidenceLineIndex: 4,
        explanation: "Includes a free initial assessment with a physiotherapist.",
      },
      {
        id: "p1-q4",
        questionNumber: 4,
        type: "gap_fill",
        prompt: "Applicant's Street Address: 42 [BLANK] Street",
        acceptableAnswers: ["Haberdasher"],
        evidenceLineIndex: 5,
        explanation: "Spelled out verbatim as H-A-B-E-R-D-A-S-H-E-R.",
      },
      {
        id: "p1-q5",
        questionNumber: 5,
        type: "gap_fill",
        prompt: "Document required at reception: a [BLANK] (or bank statement)",
        acceptableAnswers: ["utility bill", "bank statement"],
        evidenceLineIndex: 6,
        explanation: "Receptionist asks to bring a utility bill or bank statement.",
      },
    ],
  },
  {
    id: "passage-part-3",
    sectionTitle: "Academic Tutorial: Coastal Saltmarsh Restoration",
    partLabel: "IELTS Listening Part 3 · University Seminar Discussion",
    cefrBand: "Band 7.5–9.0 Target",
    totalDuration: 45,
    lines: [
      {
        id: "p3-l1",
        speaker: "Dr. Vance",
        startTime: 0,
        endTime: 7,
        text: "So, Elena and Liam, let's review the methodology for your field dissertation on coastal saltmarsh erosion.",
        isTranscriptVisible: true,
        keyVocabulary: ["methodology", "saltmarsh"],
      },
      {
        id: "p3-l2",
        speaker: "Elena",
        startTime: 7,
        endTime: 15,
        text: "We initially planned to use drone photogrammetry in November, but because of migratory birds nesting, we switched to acoustic sediment sensors.",
        isTranscriptVisible: true,
        keyVocabulary: ["drone", "sediment"],
        linkedQuestionNumber: 1,
        teachingNote: "Distractor: drone photogrammetry was abandoned due to nesting birds. Answer is 'acoustic sediment sensors' / 'sediment'.",
      },
      {
        id: "p3-l3",
        speaker: "Liam",
        startTime: 15,
        endTime: 23,
        text: "Right, and when we compared the northern estuary with the southern lagoon, we found that salinity levels fluctuated far more sharply in the lagoon.",
        isTranscriptVisible: true,
        keyVocabulary: ["salinity", "lagoon"],
        linkedQuestionNumber: 2,
        teachingNote: "Answer Q2 ('salinity'). Key academic collocation: 'salinity levels fluctuated'.",
      },
      {
        id: "p3-l4",
        speaker: "Dr. Vance",
        startTime: 23,
        endTime: 31,
        text: "Interesting. Did the historical archive from the harbor authority confirm your hypothesis about nineteenth-century seawalls?",
        isTranscriptVisible: true,
        keyVocabulary: ["archive", "seawalls"],
      },
      {
        id: "p3-l5",
        speaker: "Elena",
        startTime: 31,
        endTime: 38,
        text: "Partly, though the tidal logs prior to 1890 were illegible due to water damage, so we cross-referenced railway construction surveys instead.",
        isTranscriptVisible: true,
        keyVocabulary: ["illegible", "railway"],
        linkedQuestionNumber: 3,
        teachingNote: "Answer Q3 ('B. They were damaged and unreadable' / 'railway').",
      },
      {
        id: "p3-l6",
        speaker: "Liam",
        startTime: 38,
        endTime: 45,
        text: "For the final presentation next Tuesday, we'll focus on how oyster reefs act as natural wave attenuators.",
        isTranscriptVisible: true,
        keyVocabulary: ["oyster reefs", "wave"],
        linkedQuestionNumber: 4,
        teachingNote: "Answer Q4 ('oyster reefs').",
      },
    ],
    worksheetTitle: "Questions 1–4: Coastal Saltmarsh Dissertation Notes",
    instructionText: "Write NO MORE THAN TWO WORDS for questions 1, 2, 4 and choose the correct letter for question 3.",
    questions: [
      {
        id: "p3-q1",
        questionNumber: 1,
        type: "gap_fill",
        prompt: "Equipment selected to avoid disturbing wildlife: acoustic [BLANK] sensors",
        acceptableAnswers: ["sediment"],
        evidenceLineIndex: 1,
        explanation: "They switched from drones to acoustic sediment sensors to avoid disturbing migratory birds.",
      },
      {
        id: "p3-q2",
        questionNumber: 2,
        type: "gap_fill",
        prompt: "Environmental variable showing sharp fluctuation in the southern lagoon: [BLANK] levels",
        acceptableAnswers: ["salinity"],
        evidenceLineIndex: 2,
        explanation: "Liam notes that salinity levels fluctuated far more sharply in the southern lagoon.",
      },
      {
        id: "p3-q3",
        questionNumber: 3,
        type: "multiple_choice",
        prompt: "Why were the pre-1890 harbor tidal logs not used?",
        options: [
          "A. They were stored in a restricted municipal archive",
          "B. They had become unreadable due to water damage",
          "C. They omitted data from the southern estuary",
        ],
        acceptableAnswers: ["B", "B. They had become unreadable due to water damage"],
        evidenceLineIndex: 4,
        explanation: "Elena explains the tidal logs prior to 1890 were 'illegible due to water damage'.",
      },
      {
        id: "p3-q4",
        questionNumber: 4,
        type: "gap_fill",
        prompt: "Natural feature studied for reducing wave energy: [BLANK]",
        acceptableAnswers: ["oyster reefs", "oysters"],
        evidenceLineIndex: 5,
        explanation: "Liam highlights how oyster reefs act as natural wave attenuators.",
      },
    ],
  },
];

export const SAMPLE_SCREENSHOT_TEMPLATES: SampleScreenshotTemplate[] = [
  {
    id: "tpl-sports-centre",
    title: "Cambridge IELTS Part 1 — Form Completion Screenshot",
    subtitle: "Greenvale Community Sports Centre Registration Form (Questions 1–5)",
    badgeText: "Part 1 · Form Completion",
    passageId: "passage-part-1",
    svgDataUrl: createWorksheetSvgDataUrl(
      "GREENVALE SPORTS CENTRE — NEW MEMBER ENQUIRY FORM",
      "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
      [
        "1. Membership Tier Requested:   [ __________________ ] Fitness Membership",
        "2. Current Monthly Subscription: £ [ __________________ ] (seasonal offer)",
        "3. Free Initial Assessment with: a [ __________________ ] on first Thursday",
        "4. Home Street Address:          42 [ __________________ ] Street",
        "5. Proof of Address Required:    a [ __________________ ] or bank statement",
      ]
    ),
    extractedPayload: {
      worksheetTitle: "Questions 1–5: Greenvale Sports Centre Enquiry Form (Imported from Screenshot)",
      instructionText: "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
      questions: [
        {
          questionNumber: 1,
          type: "gap_fill",
          prompt: "Membership Tier Requested: [BLANK] Fitness Membership",
          acceptableAnswers: ["Gold"],
          evidenceLineIndex: 1,
          explanation: "Applicant asks for a Gold Fitness membership in line 2.",
        },
        {
          questionNumber: 2,
          type: "gap_fill",
          prompt: "Current Monthly Subscription: £ [BLANK] (seasonal offer)",
          acceptableAnswers: ["78", "seventy-eight"],
          evidenceLineIndex: 2,
          explanation: "£95 was the old rate; £78 is the current seasonal offer.",
        },
        {
          questionNumber: 3,
          type: "gap_fill",
          prompt: "Free Initial Assessment with: a [BLANK] on first Thursday",
          acceptableAnswers: ["physiotherapist"],
          evidenceLineIndex: 4,
          explanation: "Includes a complimentary assessment with a physiotherapist.",
        },
        {
          questionNumber: 4,
          type: "gap_fill",
          prompt: "Home Street Address: 42 [BLANK] Street",
          acceptableAnswers: ["Haberdasher"],
          evidenceLineIndex: 5,
          explanation: "Dictated letter by letter: H-A-B-E-R-D-A-S-H-E-R.",
        },
        {
          questionNumber: 5,
          type: "gap_fill",
          prompt: "Proof of Address Required: a [BLANK] or bank statement",
          acceptableAnswers: ["utility bill", "bank statement"],
          evidenceLineIndex: 6,
          explanation: "Receptionist requests a utility bill or bank statement.",
        },
      ],
    },
  },
  {
    id: "tpl-museum-tour",
    title: "Cambridge IELTS Part 2 — Visitor Guide & Multiple Choice Screenshot",
    subtitle: "Greenvale Sports & Aquatics Complex Weekend Workshop Schedule (Questions 1–4)",
    badgeText: "Part 1/2 · Mixed Question Sheet",
    passageId: "passage-part-1",
    svgDataUrl: createWorksheetSvgDataUrl(
      "SPORTS CENTRE ORIENTATION & MEMBERSHIP CHECKLIST",
      "Complete the summary below. Write ONE WORD AND/OR A NUMBER for each answer.",
      [
        "1. Package chosen by caller:     [ __________________ ] package",
        "2. Discounted monthly price:     £ [ __________________ ] per month",
        "3. Which facility is included in the Gold package?",
        "   A. Outdoor climbing tower     B. Heated swimming pool     C. Private sauna",
        "4. Street name for registration: 42 [ __________________ ] Street",
      ]
    ),
    extractedPayload: {
      worksheetTitle: "Questions 1–4: Sports Centre Orientation & Checklist (Imported from Screenshot)",
      instructionText: "Write ONE WORD AND/OR A NUMBER for blanks and choose A, B, or C for question 3.",
      questions: [
        {
          questionNumber: 1,
          type: "gap_fill",
          prompt: "Package chosen by caller: [BLANK] package",
          acceptableAnswers: ["Gold"],
          evidenceLineIndex: 1,
          explanation: "Marcus requests the Gold Fitness membership.",
        },
        {
          questionNumber: 2,
          type: "gap_fill",
          prompt: "Discounted monthly price: £ [BLANK] per month",
          acceptableAnswers: ["78", "seventy-eight"],
          evidenceLineIndex: 2,
          explanation: "Seasonal rate is £78 instead of £95.",
        },
        {
          questionNumber: 3,
          type: "multiple_choice",
          prompt: "Which facility is explicitly included in the Gold package?",
          options: [
            "A. Outdoor climbing tower",
            "B. Heated swimming pool",
            "C. Private sauna",
          ],
          acceptableAnswers: ["B", "B. Heated swimming pool", "Heated swimming pool"],
          evidenceLineIndex: 4,
          explanation: "Receptionist confirms it includes all racket courts and the heated pool.",
        },
        {
          questionNumber: 4,
          type: "gap_fill",
          prompt: "Street name for registration: 42 [BLANK] Street",
          acceptableAnswers: ["Haberdasher"],
          evidenceLineIndex: 5,
          explanation: "42 Haberdasher Street.",
        },
      ],
    },
  },
];
