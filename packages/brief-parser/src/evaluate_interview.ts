// packages/brief-parser/src/evaluate_interview.ts

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// === Pfade & .env – analog zu parse_brief.ts ===
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..'); // -> packages/brief-parser

dotenv.config({ path: path.join(PKG_ROOT, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini-2025-04-14';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error(
    'Missing env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEY'
  );
  process.exit(1);
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export type EvaluationResult = {
  interview_id: string;
  scorecard_json: any;
  completed_at: string;
};

// ------------------------------------------------------------------
// 1. Hilfsfunktion: Scorecard für EIN Interview bauen
//    (MVP – später können wir das Schema verfeinern)
// ------------------------------------------------------------------

async function buildScorecardForInterview(
  interview: any,
  answers: any[]
): Promise<any> {
  const systemPrompt = `
Du bist ein Evaluations-Bot für Interviews zu Datendomänen-Steckbriefen.

Du bewertest:
- Wie klar und konsistent die Antworten die Struktur des Steckbriefs widerspiegeln
- Wo Lücken in der Beschreibung sind
- Wo Risiken oder Widersprüche sichtbar werden
- Welche konkreten nächsten Schritte sinnvoll wären

Gib NUR ein JSON-Objekt mit folgendem Format zurück:

{
  "score_overall": Zahl 0-100,
  "strengths": [ "kurzer Punkt 1", "kurzer Punkt 2", ... ],
  "risks": [ "kurzer Punkt 1", "kurzer Punkt 2", ... ],
  "gaps": [ "fehlende Klarheit zu ...", ... ],
  "recommendations": [ "konkreter nächster Schritt 1", "konkreter nächster Schritt 2", ... ]
}

Keine Erklärtexte außerhalb dieses JSON-Objekts.
  `.trim();

  const userPrompt = `
INTERVIEW-DATENSATZ:
${JSON.stringify(interview, null, 2)}

ANTWORTEN (chronologisch):
${JSON.stringify(answers ?? [], null, 2)}

Bewerte dieses Interview gemäß der Beschreibung im Systemprompt.
Gib ausschließlich das JSON-Objekt im beschriebenen Format zurück.
  `.trim();

  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]
  });

  const raw = resp.choices[0]?.message?.content ?? '{}';

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: wir verlieren nichts, aber kennzeichnen den Fehler
    parsed = {
      parse_error: 'Model output was not valid JSON',
      raw
    };
  }

  return parsed;
}

// ------------------------------------------------------------------
// 2. Öffentliche API-Funktion: evaluateInterview
//    (wird vom brief-api-Server und ggf. von CLI/Tests genutzt)
// ------------------------------------------------------------------

export async function evaluateInterview(
  interviewId: string
): Promise<EvaluationResult> {
  // 1) Interview holen
  const { data: interviewRows, error: interviewError } = await sb
    .from('interviews')
    .select('*')
    .eq('id', interviewId);

  const interview = (interviewRows ?? [])[0];
  if (!interview) {
    throw new Error(`Interview ${interviewId} not found (0 rows in 'interviews' für id=${interviewId})`);
  }

  if (interviewError || !interview) {
    throw new Error(
      `Interview ${interviewId} not found: ${interviewError?.message}`
    );
  }

  // 2) Antworten laden (deine Tabelle heißt aktuell "answers")
  const { data: answers, error: answersError } = await sb
    .from('answers')
    .select('*')
    .eq('interview_id', interviewId)
    .order('created_at', { ascending: true });

  if (answersError) {
    throw new Error(
      `Could not load answers for ${interviewId}: ${answersError.message}`
    );
  }

  // 3) Scorecard berechnen
  const scorecard = await buildScorecardForInterview(
    interview,
    answers ?? []
  );

  // 4) Interview aktualisieren: scorecard_json + completed_at
  const completedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await sb
    .from('interviews')
    .update({
      scorecard_json: scorecard,
      completed_at: completedAt
    })
    .eq('id', interviewId)
    .select('id, scorecard_json, completed_at')
    .single();

  if (updateError || !updated) {
    throw new Error(
      `Failed to update interview ${interviewId}: ${updateError?.message}`
    );
  }

  return {
    interview_id: updated.id,
    scorecard_json: updated.scorecard_json,
    completed_at: updated.completed_at
  };
}