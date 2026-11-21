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

      // Retry if reverse proxy / dev server restart returned a transient error or HTML gateway page
      const isHtmlOrNonJsonGatewayError = !parsed && res.status >= 500;
      if ((RETRYABLE_STATUSES.has(res.status) && !parsed) || isHtmlOrNonJsonGatewayError) {
        lastError = `Server merespons status ${res.status}.`;
        if (attempt < maxRetries) {
          await delay(500 * (attempt + 1));
          continue;
        }
        return {
          ok: false,
          status: res.status,
          data: null,
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
        lastError = err?.message || 'Koneksi jaringan terputus.';
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
