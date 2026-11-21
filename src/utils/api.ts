export interface ApiJsonResult<T = Record<string, any>> {
  ok: boolean;
  status: number;
  data: T | null;
  networkError?: string;
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely convert any unknown error/payload (including `{ code, message }` or `{ error: { code, message } }`)
 * into a plain string so React JSX never receives a plain object (prevents React error #31).
 */
export function extractErrorMessage(input: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (input === null || input === undefined) return fallback;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed || fallback;
  }
  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }
  if (input instanceof Error) {
    return input.message?.trim() || fallback;
  }
  if (typeof input === 'object') {
    const obj = input as Record<string, any>;
    if ('error' in obj && obj.error !== undefined && obj.error !== null) {
      const nested = extractErrorMessage(obj.error, '');
      if (nested) return nested;
    }
    if ('message' in obj && obj.message !== undefined && obj.message !== null) {
      const msg = extractErrorMessage(obj.message, '');
      const code =
        'code' in obj && obj.code !== undefined && obj.code !== null
          ? String(obj.code).trim()
          : '';
      if (msg) {
        return code ? `[${code}] ${msg}` : msg;
      }
    }
    if ('details' in obj && typeof obj.details === 'string' && obj.details.trim()) {
      return obj.details.trim();
    }
    try {
      const serialized = JSON.stringify(obj);
      if (serialized && serialized !== '{}') return serialized;
    } catch {}
  }
  return fallback;
}

export async function postJsonWithRetry<T = Record<string, any>>(
  url: string,
  body: unknown,
  options?: {
    headers?: Record<string, string>;
    retries?: number;
    timeoutMs?: number;
  }
): Promise<ApiJsonResult<T>> {
  const maxRetries = options?.retries ?? 2;
  const timeoutMs = options?.timeoutMs ?? 10000;
  let lastStatus = 0;
  let lastError = 'Tidak dapat terhubung ke server.';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const targetUrl =
        typeof window !== 'undefined' && url.startsWith('/')
          ? `${window.location.origin}${url}`
          : url;

      const res = await fetch(targetUrl, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options?.headers || {}),
        },
        body: JSON.stringify(body ?? {}),
        signal: controller.signal,
      });

      clearTimeout(timer);
      lastStatus = res.status;

      const rawText = await res.text();
      let parsed: T | null = null;
      if (rawText) {
        try {
          parsed = JSON.parse(rawText) as T;
        } catch {
          parsed = null;
        }
      }

      // Retry transient gateway / server errors (whether HTML or JSON)
      if (RETRYABLE_STATUSES.has(res.status)) {
        lastError = parsed
          ? extractErrorMessage(parsed, `Server merespons status ${res.status}.`)
          : `Server merespons status ${res.status}.`;
        if (attempt < maxRetries) {
          await delay(500 * (attempt + 1));
          continue;
        }
        return {
          ok: false,
          status: res.status,
          data: parsed,
          networkError: lastError,
        };
      }

      if (!parsed && !res.ok) {
        return {
          ok: false,
          status: res.status,
          data: null,
          networkError: `Respons server tidak valid (HTTP ${res.status}).`,
        };
      }

      return {
        ok: res.ok,
        status: res.status,
        data: parsed,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        lastError = 'Koneksi ke server melebihi batas waktu (timeout).';
      } else {
        lastError = extractErrorMessage(err, 'Koneksi jaringan terputus.');
      }
      if (attempt < maxRetries) {
        await delay(500 * (attempt + 1));
        continue;
      }
    }
  }

  return {
    ok: false,
    status: lastStatus,
    data: null,
    networkError: lastError,
  };
}
