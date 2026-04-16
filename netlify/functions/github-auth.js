/**
 * Netlify Function: github-auth
 *
 * Proxies the two GitHub Device Flow endpoints that browsers can't call
 * directly due to missing CORS headers on GitHub's side:
 *
 *   POST /.netlify/functions/github-auth/device  → github.com/login/device/code
 *   POST /.netlify/functions/github-auth/token   → github.com/login/oauth/access_token
 *
 * Required environment variable (set in Netlify dashboard or .env):
 *   GITHUB_CLIENT_SECRET  — OAuth App client secret (never exposed to the browser)
 */

const GITHUB_DEVICE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientSecret) {
    return json(500, { error: 'GITHUB_CLIENT_SECRET is not configured' });
  }

  // Route by path suffix: /device or /token
  const path = event.path.replace(/\/$/, '');
  const action = path.split('/').pop();

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (action === 'device') {
    const { client_id } = body;
    if (!client_id) return json(400, { error: 'client_id is required' });

    const res = await fetch(GITHUB_DEVICE_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id, scope: 'gist' }),
    });
    const data = await res.json();
    return json(res.status, data);
  }

  if (action === 'token') {
    const { client_id, device_code } = body;
    if (!client_id || !device_code) return json(400, { error: 'client_id and device_code are required' });

    const res = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id,
        client_secret: clientSecret,
        device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const data = await res.json();
    return json(res.status, data);
  }

  return json(404, { error: 'Unknown action. Use /device or /token.' });
}
