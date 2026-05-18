// Mailgun API directe — pas de gateway intermédiaire
const MAILGUN_BASE = "https://api.mailgun.net";

function authHeaders(): Record<string, string> {
  const key = process.env.MAILGUN_API_KEY;
  if (!key) throw new Error("MAILGUN_API_KEY non configurée dans .env");
  // Mailgun auth: Basic base64("api:YOUR_KEY")
  const encoded = btoa(`api:${key}`);
  return { Authorization: `Basic ${encoded}` };
}

export async function mgGet<T = unknown>(path: string): Promise<T> {
  // path peut commencer par /v3/... ou /v4/... — on l'utilise direct
  const url = path.startsWith("http") ? path : `${MAILGUN_BASE}${path}`;
  const res = await fetch(url, { headers: authHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mailgun GET ${path} [${res.status}]: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Mailgun GET ${path}: réponse non-JSON`);
  }
}

export async function mgPostForm<T = unknown>(
  path: string,
  form: Record<string, string | string[]>,
): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (Array.isArray(v)) for (const item of v) body.append(k, item);
    else body.append(k, v);
  }
  // path = "/<domain>/messages" → full URL = https://api.mailgun.net/v3/<domain>/messages
  const url = path.startsWith("http") ? path : `${MAILGUN_BASE}/v3${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mailgun POST ${path} [${res.status}]: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Mailgun POST ${path}: réponse non-JSON`);
  }
}

export async function mgPutForm<T = unknown>(
  path: string,
  form: Record<string, string | string[]>,
): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (Array.isArray(v)) for (const item of v) body.append(k, item);
    else body.append(k, v);
  }
  const url = path.startsWith("http") ? path : `${MAILGUN_BASE}${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mailgun PUT ${path} [${res.status}]: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const DEFAULT_DOMAIN = process.env.MAILGUN_DOMAIN || "global-server.net";
