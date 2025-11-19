// packages/brief-api/src/llm_upload_parser.ts

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Ergebnis, das das LLM liefern soll.
 *
 * - brief  : Steckbrief
 * - sheet  : Überleitungssheet
 * - unknown: nichts davon / nicht sicher
 */
export type UploadParseResult =
  | {
      kind: 'brief';
      title: string | null;
      raw_text: string;
      domain_hint?: string | null;
      warnings: string[];
    }
  | {
      kind: 'sheet';
      theme: string | null;
      questions: {
        code: string | null;
        question: string;
        checkpoints: string[];
        criteria_per_score: {
          '1'?: string;
          '2'?: string;
          '3'?: string;
          '4'?: string;
          '5'?: string;
        };
      }[];
      theme_target_description: string | null;
      warnings: string[];
    }
  | {
      kind: 'unknown';
      reason: string;
    };

/**
 * Minimaler Input für die Parser-Funktion.
 * Die Datei selbst übergeben wir als Base64-String.
 */
export type RawUpload = {
  filename: string;
  mimetype: string;   // z. B. "image/png", "application/pdf"

  // Variante A: JSON-Upload
  base64?: string;

  // Variante B: Multipart-Upload (Buffer aus Multer)
  buffer?: Buffer;
};

const SYSTEM_PROMPT = `
Du bist ein Parser für Daten-Governance-Dokumente.

Du bekommst ein Dokument (als Bild oder als Textausschnitt) und sollst es
in genau EINES der folgenden JSON-Objekte überführen:

1) Steckbrief ("brief")
----------------------

{
  "kind": "brief",
  "title": string | null,
  "raw_text": string,
  "domain_hint": string | null;
  "warnings": string[]
}

Bedeutung:
- "title": Titel oder Überschrift des Steckbriefs, falls erkennbar.
- "raw_text": Volltext des Dokuments (so gut wie möglich).
- "domain_hint": Falls im Dokument eine Domäne / ein Domänenname / ein Domänencode
  erkennbar ist (z. B. "Termine & Finanzen", "Domäne: Finanzen"), extrahiere ihn hier
  als kurzen String. Wenn du nichts Sinnvolles findest, setze "domain_hint" auf null.
- "warnings": Liste von Hinweisen, z. B. wenn Teile unleserlich oder abgeschnitten sind.


2) Überleitungssheet ("sheet")
------------------------------

{
  "kind": "sheet",
  "theme": string | null,
  "questions": [
    {
      "code": string | null,
      "question": string,
      "checkpoints": string[],
      "criteria_per_score": {
        "1"?: string,
        "2"?: string,
        "3"?: string,
        "4"?: string,
        "5"?: string
      }
    }
  ],
  "theme_target_description": string | null,
  "warnings": string[]
}

Bedeutung:
- "theme": Name des Themenfelds, z. B. "Business Impact".
- "questions": Jede Leitfrage des Sheets:
  - "code": Fragecode (z. B. "Q1" oder "DG-Q4"), falls vorhanden.
  - "question": Formulierung der Leitfrage.
  - "checkpoints": Liste der Checkpunkte/Bullets, die zur Frage gehören.
  - "criteria_per_score": Text aus der Kriterien-Spalte für die Scores 1-5, falls vorhanden.
- "theme_target_description": Beschreibung des gewünschten Zielzustands für das ganze Thema
  (oft am unteren Seitenrand oder in einem separaten Abschnitt).
- "warnings": Liste von Hinweisen zu Unklarheiten, fehlenden Teilen etc.


3) Unbekannt ("unknown")
------------------------

{
  "kind": "unknown",
  "reason": string
}

Nutze dies, wenn das Dokument weder Steckbrief noch Überleitungssheet ist
oder die Information zu unvollständig/unklar ist.


Wichtige Regeln:
- Antworte ausnahmslos mit einem EINZIGEN JSON-Objekt nach diesem Schema.
- Gib KEINEN erklärenden Text außerhalb dieses JSON zurück.
- Antworte NICHT in Markdown-Codeblöcken, sondern gib nur das JSON-Objekt zurück.
- Wenn du unsicher bist, entscheide dich lieber für "kind": "unknown" mit einer kurzen Begründung.
`;

/**
 * PDF-Text extrahieren – mit dynamischem Import von pdf-parse,
 * damit keine seltsamen Side-Effects beim Module-Load passieren.
 */
async function extractPdfTextFromBase64(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');

  // dynamischer Import, um CommonJS/ESM sauber zu handhaben
  const pdfModule: any = await import('pdf-parse/lib/pdf-parse.js');
  const pdfParse = pdfModule.default || pdfModule;

  const pdfData = await pdfParse(buffer);
  const text: string = (pdfData.text || '').toString();
  return text.trim();
}

/**
 * Nimmt einen beliebigen Upload entgegen (Bild, PDF, Textdatei) und lässt das LLM
 * entscheiden, ob es sich um
 *   - Steckbrief (brief)
 *   - Überleitungssheet (sheet)
 *   - oder etwas anderes (unknown)
 * handelt. Zusätzlich extrahiert das LLM die relevanten Inhalte ins Ziel-JSON.
 */

export async function classifyAndExtractUpload(
  upload: RawUpload
): Promise<UploadParseResult> {
  const isImage = upload.mimetype.startsWith('image/');
  const isPdf = upload.mimetype === 'application/pdf';

  // 1) Auf einen Buffer normalisieren
  let fileBuffer: Buffer;

  if (upload.buffer) {
    // Multipart-Upload (Multer)
    fileBuffer = upload.buffer;
  } else if (upload.base64) {
    // JSON-Upload
    fileBuffer = Buffer.from(upload.base64, 'base64');
  } else {
    throw new Error('Upload must contain either buffer or base64');
  }

  // 2) Falls wir doch noch einen Base64-String brauchen (z. B. für image_url)
  const base64String = upload.base64 ?? fileBuffer.toString('base64');

  let userContent: any;

  if (isImage) {
    // Bild direkt als image_url einbetten
    userContent = [
      {
        type: 'text',
        text:
          'Analysiere dieses Bild. Es kann ein Daten-Steckbrief oder ein Überleitungssheet ' +
          'sein. Versuch es in das JSON-Schema aus dem Systemprompt zu überführen.'
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:${upload.mimetype};base64,${base64String}`
        }
      }
    ];
  } else if (isPdf) {
    // PDF -> Text aus Base64 (entweder original oder aus Buffer erzeugt)
    const text = await extractPdfTextFromBase64(base64String);
    const truncated = text.length > 8000 ? text.slice(0, 8000) : text;

    userContent = [
      {
        type: 'text',
        text:
          'Analysiere folgenden Text-Auszug aus einem PDF-Dokument. ' +
          'Es kann ein Daten-Steckbrief oder ein Überleitungssheet sein. ' +
          'Nutze das JSON-Schema aus dem Systemprompt.\n\n' +
          truncated
      }
    ];
  } else {
    // Fallback: beliebige andere Datei als Text behandeln (direkt aus Buffer)
    const text = fileBuffer.toString('utf8');
    const truncated = text.length > 8000 ? text.slice(0, 8000) : text;

    userContent = [
      {
        type: 'text',
        text:
          'Analysiere folgenden Text. Es kann ein Daten-Steckbrief oder ein Überleitungssheet sein. ' +
          'Nutze das JSON-Schema aus dem Systemprompt.\n\n' +
          truncated
      }
    ];
  }

    const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ]
  });

  const raw = (response.choices[0]?.message?.content ?? '').trim();

  // 1) JSON-Text aus evtl. Codeblock-Hülle extrahieren
  let jsonText = raw;

  // Fälle wie:
  // ```json
  // { ... }
  // ```
  // oder
  // ```
  // { ... }
  // ```
  if (jsonText.startsWith('```')) {
    const firstNewline = jsonText.indexOf('\n');
    const lastFence = jsonText.lastIndexOf('```');

    if (firstNewline !== -1 && lastFence !== -1 && lastFence > firstNewline) {
      jsonText = jsonText.slice(firstNewline + 1, lastFence).trim();
    }
  }

  let parsed: UploadParseResult;

  try {
    parsed = JSON.parse(jsonText) as UploadParseResult;
  } catch (e) {
    parsed = {
      kind: 'unknown',
      reason:
        'LLM hat kein valides JSON im erwarteten Schema geliefert. ' +
        'Rohantwort (gekürzt): ' +
        raw.slice(0, 500)
    };
  }

  // Minimal-Validierung wie bisher
  if (parsed.kind === 'brief') {
    parsed.warnings = parsed.warnings ?? [];
    if (!parsed.raw_text || typeof parsed.raw_text !== 'string') {
      parsed.warnings.push('raw_text ist leer oder kein String.');
    }
  }

  if (parsed.kind === 'sheet') {
    parsed.warnings = parsed.warnings ?? [];
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      parsed.warnings.push('Keine Fragen erkannt.');
    }
  }

  return parsed;
}