import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Alte Variante (über Workspace-Package):
// import { startInterviewsForUser } from '@datareus/brief-parser/src/start_interview_user';
// import { loadInterviewContext } from '@datareus/brief-parser/src/interview_context';
// import { saveAnswer } from '@datareus/brief-parser/src/save_answer';

// Neue Variante: relative Pfade
import { startInterviewsForUser } from '../../brief-parser/src/start_interview_user'
import { loadInterviewContext } from '../../brief-parser/src/interview_context'
import { saveAnswer } from '../../brief-parser/src/save_answer'
import { evaluateInterview } from '@datareus/brief-parser/src/evaluate_interview';
import { supabase } from './supabase_client';
import { classifyAndExtractUpload } from './llm_upload_parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..'); // Projektdach

const FALLBACK_DOMAIN_ID = process.env.FALLBACK_DOMAIN_ID ?? '00000000-0000-0000-0000-000000000000';
//if (!FALLBACK_DOMAIN_ID) {
  console.info(
    'FALLBACK_DOMAIN_ID ist (' + FALLBACK_DOMAIN_ID + ').' );
//}
// .env im Repo-Root laden (dort sollten SUPABASE_URL etc. liegen)
dotenv.config({ path: path.join(ROOT, '.env') });

const app = express();
const API_PORT = Number(process.env.BRIEF_API_PORT ?? 4000);

// NEU / VERSCHOBEN: Multer-Konfiguration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // z. B. 10 MB
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '3mb' }));


// Request-Logger zu Debugzwecken
app.use((req, _res, next) => {
  console.log('REQ', req.method, req.url);
  next();
});


// Simple Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'brief-api' });
});

/**
 * POST /api/interviews/start-for-user
 *
 * Body:
 * {
 *   "user_id": "1111-...",
 *   "interview_type": "structure" | "practice"   // optional, default: "structure"
 * }
 *
 * Antwort: { "interview_ids": [ "...", "..." ] }
 */
app.post('/api/interviews/start-for-user', async (req, res) => {
  try {
    const { user_id, interview_type } = req.body ?? {};

    if (!user_id || typeof user_id !== 'string') {
      return res
        .status(400)
        .json({ error: 'user_id (string, uuid) wird benötigt.' });
    }

    const type =
      interview_type === 'practice' || interview_type === 'structure'
        ? interview_type
        : 'structure';

    const ids = await startInterviewsForUser(user_id, type);

    res.json({
      user_id,
      interview_type: type,
      interview_ids: ids,
    });
  } catch (e: any) {
    console.error('Fehler in /start-for-user:', e);
    res.status(500).json({ error: e.message ?? 'Unknown error' });
  }
});

/**
 * GET /api/interviews/:interviewId/context
 *
 * Antwort: vollständiger InterviewContext (JSON)
 */
app.get('/api/interviews/:interviewId/context', async (req, res) => {
  try {
    const { interviewId } = req.params;

    if (!interviewId) {
      return res
        .status(400)
        .json({ error: 'interviewId in der URL wird benötigt.' });
    }

    const ctx = await loadInterviewContext(interviewId);
    res.json(ctx);
  } catch (e: any) {
    console.error('Fehler in /:interviewId/context:', e);
    res.status(500).json({ error: e.message ?? 'Unknown error' });
  }
});

/**
 * POST /api/interviews/:interviewId/answers
 *
 * Body:
 * {
 *   "question_id": "..." | null,    // optional
 *   "answer_json": { ... }          // Pflicht, strukturiertes JSON
 * }
 *
 * Antwort: gespeicherter Datensatz (id, interview_id, question_id, created_at)
 */
app.post('/api/interviews/:interviewId/answers', async (req, res) => {
  
    console.log('Hello answers!');
  
  try {
    const { interviewId } = req.params;
    const { question_id, answer_json } = req.body ?? {};

    if (!interviewId) {
      return res
        .status(400)
        .json({ error: 'interviewId in der URL wird benötigt.' });
    }

    if (answer_json === undefined) {
      return res
        .status(400)
        .json({ error: 'answer_json im Body wird benötigt.' });
    }

    const saved = await saveAnswer({
      interviewId,
      questionId:
        typeof question_id === 'string' && question_id.length > 0
          ? question_id
          : null,
      answerJson: answer_json,
    });

    res.json(saved);
  } catch (e: any) {
    console.error('Fehler in POST /:interviewId/answers:', e);
    res.status(500).json({ error: e.message ?? 'Unknown error' });
  }
});

app.post('/api/interviews/:id/evaluate', async (req, res) => {
  try {
    const interviewId = req.params.id;
    const result = await evaluateInterview(interviewId);
    res.json({ data: result });
  } catch (err) {
    console.error('Error evaluating interview', err);
    res.status(500).json({ error: 'Failed to evaluate interview' });
  }
});

/**
 * POST /api/ingest/upload
 *
 * Erwartet im Body:
 * {
 *   "filename": "mein_dokument.pdf",
 *   "mimetype": "application/pdf" | "image/png" | ...,
 *   "content_base64": "<BASE64-OHNE-data:-PREFIX>"
 * }
 *
 * Antwort:
 *  - kind: "brief"  -> brief_id, title, warnings
 *  - kind: "sheet"  -> sheet_id, theme, questions_imported, warnings
 *  - kind: "unknown" -> reason
 */

/**
 * POST /api/ingest/upload
 *
 * Variante A: Multipart
 *   -F "file=@Geltungsbereich.pdf;type=application/pdf"
 *
 * Variante B: JSON
 * {
 *   "filename": "mein_dokument.pdf",
 *   "mimetype": "application/pdf",
 *   "content_base64": "<BASE64-ohne-data:-Prefix>"
 * }
 */
app.post('/api/ingest/upload', upload.single('file'), async (req, res) => {
  try {
    // Für Multipart: file & zusätzliche Felder
    const file = req.file;
    const domain_id = req.body?.domain_id as string | undefined;

    if (!file) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'file ist Pflicht (multipart/form-data mit Feld "file").'
      });
    }

    const filename = file.originalname;
    const mimetype = file.mimetype;
    const buffer = file.buffer;

    // 1) LLM-Klassifikation + Extraction
    const parseResult = await classifyAndExtractUpload({
      filename,
      mimetype,
      buffer
    });

    // 2) Wenn kein Steckbrief/Sheet erkennbar ist
    if (parseResult.kind === 'unknown') {
      return res.status(200).json(parseResult);
    }

   // 2) Wenn ein Steckbrief erkannt wurde
    if (parseResult.kind === 'brief') {
      // 1) Domäne bestimmen 
      let domainId: string | null = null;
      const warnings = [...(parseResult.warnings ?? [])];

      if (parseResult.domain_hint && parseResult.domain_hint.trim().length > 0) {
        const hint = parseResult.domain_hint.trim();

        const { data: domainRow, error: domainErr } = await supabase
          .from('domains')
          .select('id, name')
          .ilike('name', `%${hint}%`)
          .maybeSingle();

        if (domainErr) {
          console.error('Fehler beim Domänen-Lookup:', domainErr);
          warnings.push(`Domänen-Lookup-Fehler: ${domainErr.message}`);
        } else if (domainRow) {
          domainId = domainRow.id;
        } else {
          warnings.push(
            `Keine passende Domäne zu Hint "${hint}" gefunden – verwende Fallback.`,
          );
        }
      }

      if (!domainId) {
        domainId = FALLBACK_DOMAIN_ID;
        warnings.push(
          `Keine Domäne erkannt – Fallback-Domäne ${FALLBACK_DOMAIN_ID} verwendet.`,
        );
      }

      // 2) NÄCHSTE FREIE VERSION FÜR DIESE DOMÄNE BESTIMMEN
      let nextVersion = 1;

      const { data: latestBrief, error: latestErr } = await supabase
        .from('briefs')
        .select('version')
        .eq('domain_id', domainId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestErr) {
        console.error('Fehler beim Laden der letzten Version:', latestErr);
        warnings.push(
          `Version-Lookup-Fehler: ${latestErr.message} – setze version = 1.`,
        );
      } else if (latestBrief && latestBrief.version != null) {
        nextVersion = Number(latestBrief.version) + 1;
      }

      // 3) Steckbrief einfügen – mit domain_id UND version
      const { data, error } = await supabase
        .from('briefs')
        .insert({
          domain_id: domainId,
          title: parseResult.title,
          status: 'draft',
          raw_markdown: parseResult.raw_text,
          version: nextVersion,
        })
        .select('id, title, version')
        .single();

      if (error || !data) {
        console.error('Supabase insert briefs failed:', error);
        return res.status(500).json({
          error: 'insert_failed',
          message: error?.message ?? 'Fehler beim Speichern des Steckbriefs',
        });
      }

      return res.status(200).json({
        kind: 'brief',
        brief_id: data.id,
        title: data.title,
        version: data.version,
        warnings,
      });
    }

    // 4) Überleitungssheet speichern (kann erstmal ohne domain_id bleiben)
    if (parseResult.kind === 'sheet') {
      const { data: sheetRow, error: sheetErr } = await supabase
        .from('overleitung_sheets')
        .insert({
          name: filename,
          theme: parseResult.theme,
          status: 'draft'
        })
        .select('id')
        .single();

      if (sheetErr || !sheetRow) {
        console.error('Supabase insert overleitung_sheets failed:', sheetErr);
        return res.status(500).json({
          error: 'insert_failed (sheet)',
          message: sheetErr?.message ?? 'Fehler beim Speichern des Überleitungssheets'
        });
      }

      const sheetId = sheetRow.id;
      let orderIndex = 0;
      const warnings = [...(parseResult.warnings ?? [])];

      for (const q of parseResult.questions) {
        const { error: qErr } = await supabase.from('sheet_questions').insert({
          sheet_id: sheetId,
          code: q.code,
          question: q.question,
          checkpoints: q.checkpoints,
          order_index: orderIndex,
          active: true
        });

        if (qErr) {
          console.error('Supabase insert sheet_questions failed:', qErr);
          warnings.push(`Fehler bei Frage "${q.question}": ${qErr.message}`);
        } else {
          orderIndex++;
        }
      }

      return res.status(200).json({
        kind: 'sheet',
        sheet_id: sheetId,
        theme: parseResult.theme,
        questions_imported: orderIndex,
        warnings
      });
    }

    return res.status(500).json({
      error: 'unexpected_result',
      message: 'Parser-Ergebnis hatte einen unbekannten kind-Wert.'
    });
  } catch (e: any) {
    console.error('Error in /api/ingest/upload:', e);
    return res.status(500).json({
      error: 'internal',
      message: e?.message ?? 'Unbekannter Fehler'
    });
  }
});

// JSON-Variante speziell für Flowise
app.post('/api/ingest/uploadjson', async (req, res) => {

  console.log('Hello Uploadjson!');

  console.log(
    '[UPLOAD_JSON_HIT]',
    new Date().toISOString(),
    'filename =',
    req.body?.filename,
    'mimetype =',
    req.body?.mimetype
  );

  try {
    const { filename, mimetype, content_base64 } = req.body ?? {};

    if (!filename || !mimetype || !content_base64) {
      return res.status(400).json({
        error: 'bad_request',
        message:
          'JSON-Body muss filename, mimetype und content_base64 enthalten.',
      });
    }

    // 1) LLM-Klassifikation + Extraction
    const parseResult = await classifyAndExtractUpload({
      filename,
      mimetype,
      base64: content_base64,
    });

    // 2) Wenn kein Steckbrief/Sheet erkennbar ist
    if (parseResult.kind === 'unknown') {
      return res.status(200).json(parseResult);
    }

    // 3) Steckbrief
    if (parseResult.kind === 'brief') {
      let domainId: string | null = null;
      const warnings = [...(parseResult.warnings ?? [])];

      if (parseResult.domain_hint && parseResult.domain_hint.trim().length > 0) {
        const hint = parseResult.domain_hint.trim();

        const { data: domainRow, error: domainErr } = await supabase
          .from('domains')
          .select('id, name')
          .ilike('name', `%${hint}%`)
          .maybeSingle();

        if (domainErr) {
          console.error('Fehler beim Domänen-Lookup:', domainErr);
          warnings.push(`Domänen-Lookup-Fehler: ${domainErr.message}`);
        } else if (domainRow) {
          domainId = domainRow.id;
        } else {
          warnings.push(
            `Keine passende Domäne zu Hint "${hint}" gefunden – verwende Fallback.`,
          );
        }
      }

      if (!domainId) {
        domainId = FALLBACK_DOMAIN_ID;
        warnings.push(
          `Keine Domäne erkannt – Fallback-Domäne ${FALLBACK_DOMAIN_ID} verwendet.`,
        );
      }

      // nächste freie Version bestimmen
      let nextVersion = 1;
      const { data: latestBrief, error: latestErr } = await supabase
        .from('briefs')
        .select('version')
        .eq('domain_id', domainId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestErr) {
        console.error('Fehler beim Laden der letzten Version:', latestErr);
        warnings.push(
          `Version-Lookup-Fehler: ${latestErr.message} – setze version = 1.`,
        );
      } else if (latestBrief && latestBrief.version != null) {
        nextVersion = Number(latestBrief.version) + 1;
      }

      const { data, error } = await supabase
        .from('briefs')
        .insert({
          domain_id: domainId,
          title: parseResult.title,
          status: 'draft',
          raw_markdown: parseResult.raw_text,
          version: nextVersion,
        })
        .select('id, title, version')
        .single();

      if (error || !data) {
        console.error('Supabase insert briefs failed:', error);
        return res.status(500).json({
          error: 'insert_failed',
          message: error?.message ?? 'Fehler beim Speichern des Steckbriefs',
        });
      }

      return res.status(200).json({
        kind: 'brief',
        brief_id: data.id,
        title: data.title,
        version: data.version,
        warnings,
      });
    }

    // 4) Überleitungssheet
    if (parseResult.kind === 'sheet') {
      const { data: sheetRow, error: sheetErr } = await supabase
        .from('overleitung_sheets')
        .insert({
          name: filename,
          theme: parseResult.theme,
          status: 'draft',
        })
        .select('id')
        .single();

      if (sheetErr || !sheetRow) {
        console.error('Supabase insert overleitung_sheets failed:', sheetErr);
        return res.status(500).json({
          error: 'insert_failed (sheet)',
          message:
            sheetErr?.message ?? 'Fehler beim Speichern des Überleitungssheets',
        });
      }

      const sheetId = sheetRow.id;
      let orderIndex = 0;
      const warnings = [...(parseResult.warnings ?? [])];

      for (const q of parseResult.questions) {
        const { error: qErr } = await supabase.from('sheet_questions').insert({
          sheet_id: sheetId,
          code: q.code,
          question: q.question,
          checkpoints: q.checkpoints,
          order_index: orderIndex,
          active: true,
        });

        if (qErr) {
          console.error('Supabase insert sheet_questions failed:', qErr);
          warnings.push(`Fehler bei Frage "${q.question}": ${qErr.message}`);
        } else {
          orderIndex++;
        }
      }

      return res.status(200).json({
        kind: 'sheet',
        sheet_id: sheetId,
        theme: parseResult.theme,
        questions_imported: orderIndex,
        warnings,
      });
    }

    return res.status(500).json({
      error: 'unexpected_result',
      message: 'Parser-Ergebnis hatte einen unbekannten kind-Wert.',
    });
  } catch (e: any) {
    console.error('Error in /api/ingest/uploadjson:', e);
    return res.status(500).json({
      error: 'internal',
      message: e?.message ?? 'Unbekannter Fehler',
    });
  }
});

// Catch-all für alles, was keine Route gefunden hat
app.use((req, res) => {
  console.log('404 handler reached in brief-api:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'not_found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Server starten
app.listen(API_PORT, () => {
  console.log(
    `Check: Brief-API läuft auf Port ${API_PORT} (BRIEF_API_PORT=${process.env.BRIEF_API_PORT})`
  );

  console.log('Hello World!');
});

