/**
 * Pure helpers for the LoopQuest Flowise tool — no Flowise/LangChain imports so
 * they can be unit-tested in isolation.
 */

export interface ReviewConfig {
  module: string; // one of the review games
  mode: string; // 'gate' | 'monitor'
  timeoutSeconds?: number;
  onTimeout?: string; // 'escalate' | 'reject' | 'approve'
  source?: string;
}

export interface ReviewInput {
  content: string;
  title?: string;
  claim?: string; // grounding only
  source?: string; // grounding only: the reference text
}

/** Build the POST /api/v1/tasks body from the tool call + node config. */
export function buildTaskBody(input: ReviewInput, cfg: ReviewConfig): Record<string, unknown> {
  const payload: Record<string, unknown> = { content: input.content, body: input.content };
  if (input.claim) payload['claim'] = input.claim;
  if (input.source) payload['source'] = input.source;

  const body: Record<string, unknown> = {
    module: cfg.module || 'swiper',
    mode: cfg.mode || 'gate',
    payload,
    card: { title: input.title || 'Review', body: input.content },
    source: cfg.source || 'flowise',
  };
  if (cfg.timeoutSeconds) body['timeout_seconds'] = cfg.timeoutSeconds;
  if (cfg.onTimeout) body['on_timeout'] = cfg.onTimeout;
  return body;
}

export interface TaskStatus {
  status?: string; // 'pending' | 'reviewed' | 'escalated'
  verdict?: boolean | null;
  verdict_choice?: string | null;
  verdict_reason?: string | null;
  timed_out?: boolean;
}

/**
 * Turn a polled task into a human-readable verdict string for the agent, or
 * `null` while it's still pending (keep polling).
 */
export function verdictToString(task: TaskStatus): string | null {
  if (task.status === 'reviewed') {
    const decision = task.verdict === true ? 'APPROVED' : task.verdict === false ? 'FLAGGED' : 'RESOLVED';
    const parts = [`Human review ${decision}`];
    if (task.verdict_choice) parts.push(`choice: ${task.verdict_choice}`);
    if (task.verdict_reason) parts.push(`reason: ${task.verdict_reason}`);
    if (task.timed_out) parts.push('(auto-resolved on timeout)');
    return parts.join(' · ');
  }
  if (task.status === 'escalated') {
    return 'Human review ESCALATED — no automatic verdict; a person will follow up.';
  }
  return null; // still pending
}
