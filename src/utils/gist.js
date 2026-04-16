const GIST_API = 'https://api.github.com/gists';
// Proxied through our Netlify function to work around CORS restrictions
const AUTH_PROXY = '/.netlify/functions/github-auth';

function authHeaders(token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function fetchGistData(gistId, token) {
  const res = await fetch(`${GIST_API}/${gistId}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);

  const gist = await res.json();
  const jsonFile = Object.values(gist.files).find((f) => f.filename.endsWith('.json'));
  if (!jsonFile) throw new Error('No .json file found in the gist.');

  // content may be truncated for very large files — fetch raw URL if needed
  const content = jsonFile.truncated
    ? await fetch(jsonFile.raw_url).then((r) => r.text())
    : jsonFile.content;

  return { data: JSON.parse(content), filename: jsonFile.filename };
}

export async function saveGistData(gistId, filename, data, token) {
  const res = await fetch(`${GIST_API}/${gistId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [filename]: { content: JSON.stringify(data, null, 2) } } }),
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
}

/** Extracts the gist ID from a full URL or returns the input as-is. */
export function extractGistId(input) {
  const cleaned = input.trim().replace(/\/$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1];
}

/** Creates a new secret Gist with the given data and returns { gistId, gistUrl, filename }. */
export async function createGist(filename, data, token, description = 'Pen Spinning Skill Tree') {
  const res = await fetch(GIST_API, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description,
      public: false,
      files: { [filename]: { content: JSON.stringify(data, null, 2) } },
    }),
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
  const gist = await res.json();
  return { gistId: gist.id, gistUrl: gist.html_url, filename };
}

// ---------------------------------------------------------------------------
// GitHub Device Flow OAuth
// ---------------------------------------------------------------------------

/** Step 1: request a device + user code pair from GitHub (via proxy). */
export async function requestDeviceCode(clientId) {
  const res = await fetch(`${AUTH_PROXY}/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId }),
  });
  if (!res.ok) throw new Error(`Auth proxy error ${res.status}: ${res.statusText}`);
  return res.json();
  // returns: { device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval }
}

/**
 * Step 2: poll GitHub until the user authorises (or the code expires / is denied).
 * Resolves with the access token string; rejects on terminal errors.
 * Pass an AbortSignal to cancel polling.
 */
export function pollForToken(clientId, deviceCode, intervalSecs, signal) {
  return new Promise((resolve, reject) => {
    let delay = intervalSecs * 1000;

    const attempt = async () => {
      if (signal?.aborted) { reject(new Error('Cancelled')); return; }
      try {
        const res = await fetch(`${AUTH_PROXY}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, device_code: deviceCode }),
        });
        const json = await res.json();

        if (json.access_token) { resolve(json.access_token); return; }

        switch (json.error) {
          case 'authorization_pending': break;
          case 'slow_down': delay += 5000; break;
          case 'expired_token': reject(new Error('Code expired. Please try again.')); return;
          case 'access_denied':  reject(new Error('Access denied.')); return;
          default: reject(new Error(json.error_description ?? json.error ?? 'Unknown error')); return;
        }
      } catch (err) {
        reject(err); return;
      }

      if (!signal?.aborted) setTimeout(attempt, delay);
    };

    setTimeout(attempt, delay);
  });
}

/** Returns all gists for the authenticated user (up to 100). */
async function listGists(token) {
  const res = await fetch(`${GIST_API}?per_page=100`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * Scans the user's gists for all that look like a skill tree (have nodes + edges).
 * Returns an array of matches — may be empty, one, or many.
 * Caller is responsible for presenting a picker when multiple are found.
 */
export async function findSkillTreeGists(token) {
  const gists = await listGists(token);
  const results = [];
  for (const gist of gists) {
    const jsonFile = Object.values(gist.files).find((f) => f.filename.endsWith('.json'));
    if (!jsonFile) continue;
    try {
      const content = await fetch(jsonFile.raw_url).then((r) => r.text());
      const data = JSON.parse(content);
      if (data.nodes && data.edges) {
        results.push({
          gistId: gist.id,
          gistUrl: gist.html_url,
          filename: jsonFile.filename,
          description: gist.description || jsonFile.filename,
          updatedAt: gist.updated_at,
          data,
        });
      }
    } catch {
      // Not a valid skill tree — skip
    }
  }
  return results;
}
