export interface Credentials {
  username: string;
  password: string;
}

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

async function request<T>(
  url: string,
  creds: Credentials,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-username': creds.username,
        'x-password': creds.password,
        ...options.headers,
      },
    });

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

export function browse(creds: Credentials, path?: string): Promise<ApiResult<BrowseResult>> {
  const url = path ? `/api/browse?path=${encodeURIComponent(path)}` : '/api/browse';
  return request<BrowseResult>(url, creds);
}

export function getSessions(creds: Credentials): Promise<ApiResult<{ sessions: Session[] }>> {
  return request<{ sessions: Session[] }>('/api/sessions', creds);
}

// `continueConversation` is kept in the wire format and on the server side
// but is not currently exposed in the UI — see ROADMAP.md ("Resume a previous
// session") for why it's disabled today.
export function startSession(
  creds: Credentials,
  dir: string,
  name: string,
  continueConversation = false
): Promise<ApiResult<{ ok: boolean; name: string; dir: string }>> {
  return request('/api/sessions/start', creds, {
    method: 'POST',
    body: JSON.stringify({ dir, name, continueConversation }),
  });
}

export function getSessionOutput(
  creds: Credentials,
  name: string
): Promise<ApiResult<{ output: string }>> {
  return request(`/api/sessions/output/${encodeURIComponent(name)}`, creds);
}

export function killSession(
  creds: Credentials,
  name: string
): Promise<ApiResult<{ ok: boolean }>> {
  return request('/api/sessions/kill', creds, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
