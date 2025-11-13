import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(PKG_ROOT, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ===== Typen =====

export interface SaveAnswerInput {
  interviewId: string;
  questionId?: string | null;
  /**
   * Frei strukturiertes JSON mit allem, was zu dieser Antwort gehört:
   * - question_text (vom LLM)
   * - target (theme, question_code, sheet, ...)
   * - user_answer (freier Text)
   * - evtl. nachgelagerte Interpretation
   */
  answerJson: any;
}

export interface SavedAnswer {
  id: string;
  interview_id: string;
  question_id: string | null;
  created_at: string;
}

// ===== Kernfunktion =====

export async function saveAnswer(input: SaveAnswerInput): Promise<SavedAnswer> {
  const { interviewId, questionId = null, answerJson } = input;

  // Optional: prüfen, ob Interview existiert und nicht completed/abandoned ist
  const { data: interview, error: iErr } = await sb
    .from('interviews')
    .select('id, status')
    .eq('id', interviewId)
    .single();

  if (iErr) {
    throw new Error(`Interview ${interviewId} nicht gefunden: ${iErr.message}`);
  }

  if (!interview) {
    throw new Error(`Interview ${interviewId} nicht gefunden (null data)`);
  }

  if (interview.status === 'completed' || interview.status === 'abandoned') {
    throw new Error(
      `Interview ${interviewId} ist bereits im Status "${interview.status}" – Antworten werden nicht mehr akzeptiert.`,
    );
  }

  const { data, error } = await sb
    .from('answers')
    .insert({
      interview_id: interviewId,
      question_id: questionId,
      answer_json: answerJson,
    })
    .select('id, interview_id, question_id, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data as SavedAnswer;
}

// ===== CLI-Entry zum Testen =====

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  const interviewId = process.argv[2];
  const questionIdArg = process.argv[3] || null;
  const answerJsonRaw = process.argv[4];

  if (!interviewId || !answerJsonRaw) {
    console.error(
      'Usage: pnpm -F @datareus/brief-parser run save-answer <interview_id> [question_id|null] \'<answer_json>\'',
    );
    console.error(
      'Beispiel: pnpm -F @datareus/brief-parser run save-answer 1234-... null \'{"question_text":"...","user_answer":"..."}\'',
    );
    process.exit(1);
  }

  let answerJson: any;
  try {
    answerJson = JSON.parse(answerJsonRaw);
  } catch (e: any) {
    console.error('Konnte answer_json nicht parsen:', e.message);
    process.exit(1);
  }

  saveAnswer({
    interviewId,
    questionId: questionIdArg === 'null' ? null : questionIdArg,
    answerJson,
  })
    .then((saved) => {
      console.log('Gespeicherte Antwort:', saved);
    })
    .catch((e) => {
      console.error('Fehler beim Speichern der Antwort:', e);
      process.exit(1);
    });
}
