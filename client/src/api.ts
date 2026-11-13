export interface DirEntry {
  name: string;
  path: string;
}

export interface BrowseResult {
  current: string;
  parent: string | null;
  dirs: DirEntry[];
}

export interface Session {
  name: string;
  created: number;
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// Auth rides on the HttpOnly session cookie, sent automatically on same-origin
// fetches. A 401 anywhere means the cookie is missing/expired: App registers a
// handler that sends the user back to the login screen.
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (res.status === 401) onUnauthorized();

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
    }

    const data = await res.json() as T;
    return { data, error: null };
  } catch {
    return { data: null, error: 'Network error' };
  }
}

export function login(
  username: string,
  password: string
): Promise<ApiResult<{ ok: boolean }>> {
  return request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function logout(): Promise<ApiResult<{ ok: boolean }>> {
  return request('/api/logout', { method: 'POST' });
}

export function browse(path?: string): Promise<ApiResult<BrowseResult>> {
  const url = path ? `/api/browse?path=${encodeURIComponent(path)}` : '/api/browse';
  return request<BrowseResult>(url);
}

export function getSessions(): Promise<ApiResult<{ sessions: Session[] }>> {
  return request<{ sessions: Session[] }>('/api/sessions');
}

// Mirrors MemoryInfo in server/utils/memory.ts. availableBytes is MemAvailable
// (reclaimable cache included), not MemFree. Swap figures are null when the
// server couldn't read /proc/meminfo.
export interface MemoryInfo {
  totalBytes: number;
  availableBytes: number;
  swapTotalBytes: number | null;
  swapUsedBytes: number | null;
  sampledAt: number;
}

export function getMemory(): Promise<ApiResult<MemoryInfo>> {
  return request<MemoryInfo>('/api/system/memory');
}

// A model is identified by its `claude --model` alias (e.g. 'opus'). The full
// catalogue is fetched from the server so the list lives in exactly one place.
export type ModelChoice = string;

export interface ModelOption {
  id: string;
  label: string;
}

export function getModels(): Promise<ApiResult<{ models: ModelOption[]; default: string }>> {
  return request<{ models: ModelOption[]; default: string }>('/api/sessions/models');
}

export function suggestSessionName(
  dir: string,
  model: ModelChoice
): Promise<ApiResult<{ name: string }>> {
  const url = `/api/sessions/suggest?dir=${encodeURIComponent(dir)}&model=${encodeURIComponent(model)}`;
  return request<{ name: string }>(url);
}

export function startSession(
  dir: string,
  name: string,
  continueConversation = false,
  model: ModelChoice = 'opus'
): Promise<ApiResult<{ ok: boolean; name: string; dir: string }>> {
  return request('/api/sessions/start', {
    method: 'POST',
    body: JSON.stringify({ dir, name, continueConversation, model }),
  });
}

export function getSessionOutput(
  name: string
): Promise<ApiResult<{ output: string }>> {
  return request(`/api/sessions/output/${encodeURIComponent(name)}`);
}

export function killSession(
  name: string
): Promise<ApiResult<{ ok: boolean }>> {
  return request('/api/sessions/kill', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
