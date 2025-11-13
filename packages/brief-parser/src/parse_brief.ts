import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Ajv from 'ajv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';

// === Pfade robust bestimmen (immer relativ zum Package-Ordner) ===
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..'); // -> packages/brief-parser
const read = (rel: string) => fs.readFileSync(path.join(PKG_ROOT, rel), 'utf8');

// === .env aus dem Package-Ordner laden ===
dotenv.config({ path: path.join(PKG_ROOT, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini-2025-04-14';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Prompt-Template und Schema laden
const PROMPT = read('prompts/brief_parser.de.txt'); // generischer Prompt
const SCHEMA = JSON.parse(read('schemas/brief_findings.schema.json'));

const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(SCHEMA);

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

async function callLLM(briefText: string, questionsJson: string) {
  const promptHash = sha256(PROMPT).slice(0, 16);

  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: PROMPT,
      },
      {
        role: 'user',
        content:
          '<<STECKBRIEF>>\n' +
          briefText +
          '\n\n<<LEITFRAGEN>>\n' +
          questionsJson +
          '\n\nAntworte ausschließlich mit einem JSON-Array, wie im Systemprompt beschrieben.',
      },
    ],
  });

  const out = resp.choices[0]?.message?.content ?? '';
  let json: any;
  try {
    json = JSON.parse(out);
  } catch (e) {
    throw new Error('LLM lieferte kein valides JSON:\n' + out);
  }

  if (!Array.isArray(json)) {
    throw new Error('LLM-Output ist kein Array:\n' + JSON.stringify(json, null, 2));
  }

  console.log('LLM meta:', { model: MODEL, prompt_hash: promptHash });

  return json;
}

/**
 * Führt den Parser für eine Kombination aus Brief und Sheet aus.
 * Gibt die Anzahl der gespeicherten Findings zurück.
 */
export async function parseBriefForSheet(briefId: string, sheetId: string): Promise<number> {
  // 1) Brief holen
  const { data: brief, error: briefErr } = await sb
    .from('briefs')
    .select('id, raw_markdown')
    .eq('id', briefId)
    .single();

  if (briefErr) throw briefErr;
  if (!brief?.raw_markdown) throw new Error('Kein raw_markdown in briefs für ' + briefId);

  // 2) Sheet holen
  const { data: sheet, error: sheetErr } = await sb
    .from('overleitung_sheets')
    .select('id, name, theme, status, version')
    .eq('id', sheetId)
    .single();

  if (sheetErr) throw sheetErr;
  if (!sheet) throw new Error('Kein Überleitungssheet gefunden für ' + sheetId);

  // 3) Leitfragen laden
  const { data: questions, error: qErr } = await sb
    .from('sheet_questions')
    .select('id, code, question, checkpoints, order_index, active')
    .eq('sheet_id', sheetId)
    .eq('active', true)
    .order('order_index', { ascending: true });

  if (qErr) throw qErr;
  if (!questions || questions.length === 0) {
    throw new Error('Keine aktiven Leitfragen für Sheet ' + sheetId);
  }

  // 4) Fragen für das LLM vorbereiten
  const questionsForLLM = questions.map((q) => ({
    code: q.code,
    question: q.question,
    checkpoints: q.checkpoints || [],
  }));

  const questionsJson = JSON.stringify(questionsForLLM, null, 2);

  // 5) LLM aufrufen
  const findings = await callLLM(brief.raw_markdown, questionsJson);

  // 6) Schema-Validierung
  const valid = validate(findings);
  if (!valid) {
    throw new Error('Schema-Fehler im LLM-Output: ' + JSON.stringify(validate.errors, null, 2));
  }

  // 7) Ergebnisse in brief_sheet_findings upserten
  for (const item of findings as any[]) {
    const code: string = item.question_code;
    if (!code) {
      console.warn('Ein Finding ohne question_code – wird übersprungen:', item);
      continue;
    }

    const q = questions.find((qq) => qq.code === code);
    if (!q) {
      console.warn('Kein passender question_code im Sheet für:', code);
      continue;
    }

    const { error: upErr } = await sb.from('brief_sheet_findings').upsert(
      {
        brief_id: briefId,
        sheet_id: sheetId,
        question_id: q.id,
        finding_json: item,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'brief_id,sheet_id,question_id',
      },
    );

    if (upErr) throw upErr;
  }

  console.log(
    `OK – Findings gespeichert für Brief ${briefId} und Sheet ${sheetId} (Anzahl: ${findings.length})`,
  );

  return (findings as any[]).length;
}

// === CLI-Entry, aber nur, wenn dieses File direkt gestartet wird ===
const isDirectRun =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  const briefId = process.argv[2];
  const sheetId = process.argv[3];

  if (!briefId || !sheetId) {
    console.error('Usage: pnpm -F @datareus/brief-parser parse <briefId> <sheetId>');
    process.exit(1);
  }

  parseBriefForSheet(briefId, sheetId).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
