import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'url';

// Alte Variante (über Workspace-Package):
// import { startInterviewsForUser } from '@datareus/brief-parser/src/start_interview_user';
// import { loadInterviewContext } from '@datareus/brief-parser/src/interview_context';
// import { saveAnswer } from '@datareus/brief-parser/src/save_answer';

// Neue Variante: relative Pfade
import { startInterviewsForUser } from '../../brief-parser/src/start_interview_user'
import { loadInterviewContext } from '../../brief-parser/src/interview_context'
import { saveAnswer } from '../../brief-parser/src/save_answer'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..'); // Projektdach

// .env im Repo-Root laden (dort sollten SUPABASE_URL etc. liegen)
dotenv.config({ path: path.join(ROOT, '.env') });

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Server starten
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Brief-API läuft auf Port ${PORT}`);
});