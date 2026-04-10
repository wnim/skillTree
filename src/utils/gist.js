const GIST_API = 'https://api.github.com/gists';

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
