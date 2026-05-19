// Global AI request queue — prevents rate limit errors
// Processes one request at a time with minimum delay between calls

const DELAY_MS = 4_500; // Gemini free tier: 15 req/min → 1 req/4s

type Task = () => Promise<void>;

class AIQueue {
  private queue: Task[] = [];
  private running = false;
  private lastRun = 0;

  enqueue(task: Task): void {
    this.queue.push(task);
    if (!this.running) this.run();
  }

  private async run() {
    this.running = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      const wait = Math.max(0, this.lastRun + DELAY_MS - now);
      if (wait > 0) await delay(wait);
      const task = this.queue.shift();
      if (task) {
        this.lastRun = Date.now();
        try { await task(); } catch { /* individual tasks handle their own errors */ }
      }
    }
    this.running = false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// Singleton queue shared across all VideoRow components
export const aiQueue = new AIQueue();

// Retry wrapper for 429 errors
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      lastError = err;
      // Check if it's a rate limit error (429)
      if (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED")) {
        // Extract retry delay from error message if available
        const match = err.message.match(/retry in (\d+)/i);
        const waitSec = match ? parseInt(match[1]) + 2 : Math.pow(2, attempt + 1) * 5;
        console.warn(`[AI Queue] Rate limited. Retrying in ${waitSec}s (attempt ${attempt + 1}/${maxRetries})...`);
        await delay(waitSec * 1_000);
        continue;
      }
      throw err; // Non-rate-limit errors: fail immediately
    }
  }
  throw lastError ?? new Error("Max retries exceeded");
}
