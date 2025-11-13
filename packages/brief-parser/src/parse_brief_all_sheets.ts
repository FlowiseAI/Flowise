import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createClient } from '@supabase/supabase-js';
import { parseBriefForSheet } from './parse_brief';

// Pfad zum Package
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');

// .env laden
dotenv.config({ path: path.join(PKG_ROOT, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * Führt das Parsing für einen Brief über alle aktiven Sheets aus.
 * Gibt die Gesamtanzahl der erzeugten Findings zurück.
 */
export async function parseBriefForAllSheets(briefId: string): Promise<number> {
  // Brief einmal einlesen, nur zum Check, ob er existiert
  const { data: brief, error: bErr } = await sb
    .from('briefs')
    .select('id, title')
    .eq('id', briefId)
    .single();

  if (bErr) throw bErr;
  if (!brief) throw new Error('Kein Brief gefunden für id=' + briefId);

  // Alle aktiven Sheets laden
  const { data: sheets, error: sErr } = await sb
    .from('overleitung_sheets')
    .select('id, name, theme, status')
    .eq('status', 'active');

  if (sErr) throw sErr;
  if (!sheets || sheets.length === 0) {
    console.log('Keine aktiven Überleitungssheets gefunden.');
    return 0;
  }

  console.log(
    `Starte Parsing für Brief ${brief.id} (${brief.title ?? 'ohne Titel'}) über ${sheets.length} Sheet(s)…`,
  );

  let total = 0;

  for (const sheet of sheets) {
    console.log(
      `\n=== Brief ${brief.id} × Sheet ${sheet.id} (${sheet.name}) [${sheet.theme}] ===`,
    );
    try {
      const count = await parseBriefForSheet(brief.id, sheet.id);
      total += count;
    } catch (e) {
      console.error('Fehler bei Sheet', { sheet_id: sheet.id, error: e });
      // Fehler loggen und mit dem nächsten Sheet weitermachen
    }
  }

  console.log(
    `\nFertig für Brief ${brief.id}. Insgesamt erzeugte/aktualisierte Findings: ${total}`,
  );
  return total;
}

// CLI-Entry nur wenn Datei direkt gestartet wird
const isDirectRun =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  const briefId = process.argv[2];

  if (!briefId) {
    console.error('Usage: pnpm -F @datareus/brief-parser run parse-brief-all <briefId>');
    process.exit(1);
  }

  parseBriefForAllSheets(briefId).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
