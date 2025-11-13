import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==== Setup wie in den anderen Skripten ====

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(PKG_ROOT, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type InterviewType = 'structure' | 'practice';

interface BriefRow {
  id: string;
  domain_id: string | null;
  title: string | null;
  status: string | null;
}

// ==== Hilfsfunktionen ====

async function loadDomainIdsForUser(userId: string): Promise<string[]> {
  const { data, error } = await sb
    .from('user_domain_map')
    .select('domain_id')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as any[])
    .map((row) => row.domain_id as string | null)
    .filter((id): id is string => !!id);
}

async function loadBriefsForDomains(domainIds: string[]): Promise<BriefRow[]> {
  if (domainIds.length === 0) return [];

  const { data, error } = await sb
    .from('briefs')
    .select('id, domain_id, title, status')
    .in('domain_id', domainIds);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data as unknown as BriefRow[];
}

async function ensureInterviewForBrief(
  userId: string,
  brief: BriefRow,
  interviewType: InterviewType,
): Promise<string> {
  // Prüfen, ob es bereits ein laufendes Interview für diese Kombination gibt
  const { data: existing, error: existingErr } = await sb
    .from('interviews')
    .select('id, status, completed_at')
    .eq('user_id', userId)
    .eq('brief_id', brief.id)
    .eq('interview_type', interviewType)
    .is('completed_at', null)
    .maybeSingle();

  if (existingErr) {
    throw existingErr;
  }

  if (existing) {
    console.log(
      `Nutze bestehendes Interview ${existing.id} für Brief ${brief.id} (${brief.title ?? 'ohne Titel'})`,
    );
    return existing.id;
  }

  // Neues Interview anlegen
  const { data: inserted, error: insertErr } = await sb
    .from('interviews')
    .insert({
      user_id: userId,
      domain_id: brief.domain_id,
      brief_id: brief.id,
      interview_type: interviewType,
      status: 'started',
    })
    .select('id')
    .single();

  if (insertErr) {
    throw insertErr;
  }

  console.log(
    `Neues Interview ${inserted.id} für Brief ${brief.id} (${brief.title ?? 'ohne Titel'}) angelegt.`,
  );
  return inserted.id as string;
}

// ==== Hauptfunktion: für einen User Interviews starten ====

export async function startInterviewsForUser(
  userId: string,
  interviewType: InterviewType = 'structure',
): Promise<string[]> {
  console.log(`Starte Interviews für User ${userId} (Typ: ${interviewType}) …`);

  const domainIds = await loadDomainIdsForUser(userId);
  if (domainIds.length === 0) {
    console.log('Keine Domänen für diesen User gefunden (user_domain_map leer).');
    return [];
  }

  console.log(`User ist folgenden Domänen zugeordnet: ${domainIds.join(', ')}`);

  const briefs = await loadBriefsForDomains(domainIds);
  if (briefs.length === 0) {
    console.log('Keine Steckbriefe für die Domänen dieses Users gefunden.');
    return [];
  }

  console.log(`Gefundene Steckbriefe für den User:`);
  for (const b of briefs) {
    console.log(`- ${b.id} (${b.title ?? 'ohne Titel'})`);
  }

  const interviewIds: string[] = [];
  for (const brief of briefs) {
    const interviewId = await ensureInterviewForBrief(userId, brief, interviewType);
    interviewIds.push(interviewId);
  }

  console.log(
    `Fertig. Insgesamt ${interviewIds.length} Interview(s) für User ${userId} im Typ ${interviewType}.`,
  );
  return interviewIds;
}

// ==== CLI-Entry ====

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  const userId = process.argv[2];
  const typeArg = (process.argv[3] as InterviewType | undefined) ?? 'structure';

  if (!userId) {
    console.error(
      'Usage: pnpm -F @datareus/brief-parser run start-interview-user <user_id> [structure|practice]',
    );
    process.exit(1);
  }

  if (typeArg !== 'structure' && typeArg !== 'practice') {
    console.error('interview_type muss "structure" oder "practice" sein.');
    process.exit(1);
  }

  startInterviewsForUser(userId, typeArg)
    .then((ids) => {
      console.log('Interview-IDs:', ids);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
