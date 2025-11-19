import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'url';
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

//console.log('Verbinde mit Supabase URL:', SUPABASE_URL);

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function runAll() {
  // 1) Alle aktiven Briefs holen
  const { data: allBriefs, error: bErr } = await sb
    .from('briefs')
    .select('id, domain_id, title, status, version')
    .in('status', ['draft', 'active']);

  if (bErr) throw bErr;

  // Neueste Version pro Domäne extrahieren (weil distinct nicht unterstützt wird)
  const briefsByDomain = new Map<string, any>();

for (const b of allBriefs ?? []) {
  const existing = briefsByDomain.get(b.domain_id);
  if (!existing || b.version > existing.version) {
    briefsByDomain.set(b.domain_id, b);
  }
}

const briefs = Array.from(briefsByDomain.values());

    //console.log('DEBUG Briefs-Query:', { error: bErr, count: briefs?.length, briefs });

  if (bErr) throw bErr;
  if (!briefs || briefs.length === 0) {
    console.log('Keine Steckbriefe mit Status draft/active gefunden.');
    return;
  }

  // 2) Alle aktiven Sheets holen
  const { data: sheets, error: sErr } = await sb
    .from('overleitung_sheets')
    .select('id, name, theme, status')
    .eq('status', 'active');

  if (sErr) throw sErr;
  if (!sheets || sheets.length === 0) {
    console.log('Keine aktiven Überleitungssheets gefunden.');
    return;
  }

  console.log(`Starte Batch-Parsing für ${briefs.length} Steckbriefe × ${sheets.length} Überleitungssheets …`);

  let total = 0;

  for (const brief of briefs) {
    for (const sheet of sheets) {
      console.log(
        `\n=== Steckbrief ${brief.id} (${brief.title ?? 'ohne Titel'}) × Überleitungssheet ${sheet.id} (${sheet.name}) ===`,
      );

      try {
        const count = await parseBriefForSheet(brief.id, sheet.id);
        total += count;
      } catch (e) {
        console.error('Fehler bei Kombination', { brief_id: brief.id, sheet_id: sheet.id, error: e });
        // wir loggen und machen mit der nächsten Kombination weiter
      }
    }
  }

  console.log(`\nFertig. Insgesamt gespeicherte Findings (Summe über alle Läufe): ${total}`);
}

runAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
