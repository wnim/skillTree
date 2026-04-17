import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchGistData,
  saveGistData,
  createGist,
  deleteGistById,
  requestDeviceCode,
  pollForToken,
} from '../gist';

const GIST_API = 'https://api.github.com/gists';

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// fetchGistData
// ---------------------------------------------------------------------------
describe('fetchGistData', () => {
  it('parses JSON file content from gist response', async () => {
    const data = { nodes: [], edges: [] };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: {
          'tree.json': {
            filename: 'tree.json',
            truncated: false,
            content: JSON.stringify(data),
          },
        },
      }),
    });

    const result = await fetchGistData('gist123', 'tok');
    expect(result).toEqual({ data, filename: 'tree.json' });
    expect(fetchMock).toHaveBeenCalledWith(`${GIST_API}/gist123`, {
      headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
    });
  });

  it('fetches raw URL when content is truncated', async () => {
    const data = { nodes: [{ id: 'a' }], edges: [] };
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: {
            'tree.json': {
              filename: 'tree.json',
              truncated: true,
              raw_url: 'https://raw.example.com/tree.json',
              content: '',
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        text: async () => JSON.stringify(data),
      });

    const result = await fetchGistData('gist123', 'tok');
    expect(result.data).toEqual(data);
    expect(fetchMock).toHaveBeenCalledWith('https://raw.example.com/tree.json');
  });

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(fetchGistData('bad', 'tok')).rejects.toThrow('GitHub API error 404');
  });

  it('throws when no .json file in gist', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: { 'readme.md': { filename: 'readme.md' } } }),
    });
    await expect(fetchGistData('gist123', 'tok')).rejects.toThrow('No .json file');
  });
});

// ---------------------------------------------------------------------------
// saveGistData
// ---------------------------------------------------------------------------
describe('saveGistData', () => {
  it('sends PATCH with correct body', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const data = { nodes: [], edges: [] };
    await saveGistData('gist123', 'tree.json', data, 'tok');

    expect(fetchMock).toHaveBeenCalledWith(`${GIST_API}/gist123`, {
      method: 'PATCH',
      headers: expect.objectContaining({
        Authorization: 'Bearer tok',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ files: { 'tree.json': { content: JSON.stringify(data, null, 2) } } }),
    });
  });

  it('throws on error status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });
    await expect(saveGistData('gist123', 'f.json', {}, 'tok')).rejects.toThrow('401');
  });
});

// ---------------------------------------------------------------------------
// createGist
// ---------------------------------------------------------------------------
describe('createGist', () => {
  it('creates gist and returns id/url/filename', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new123', html_url: 'https://gist.github.com/new123' }),
    });

    const result = await createGist('tree.json', { nodes: [] }, 'tok');
    expect(result).toEqual({
      gistId: 'new123',
      gistUrl: 'https://gist.github.com/new123',
      filename: 'tree.json',
    });
    expect(fetchMock).toHaveBeenCalledWith(GIST_API, expect.objectContaining({ method: 'POST' }));
  });

  it('throws on error status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });
    await expect(createGist('f.json', {}, 'tok')).rejects.toThrow('500');
  });
});

// ---------------------------------------------------------------------------
// deleteGistById
// ---------------------------------------------------------------------------
describe('deleteGistById', () => {
  it('sends DELETE request', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    await deleteGistById('gist123', 'tok');
    expect(fetchMock).toHaveBeenCalledWith(`${GIST_API}/gist123`, {
      method: 'DELETE',
      headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
    });
  });

  it('throws on error status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(deleteGistById('bad', 'tok')).rejects.toThrow('404');
  });
});

// ---------------------------------------------------------------------------
// requestDeviceCode
// ---------------------------------------------------------------------------
describe('requestDeviceCode', () => {
  it('posts to auth proxy and returns response', async () => {
    const deviceResponse = { device_code: 'dc123', user_code: 'ABCD-1234' };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => deviceResponse });

    const result = await requestDeviceCode('client_id_123');
    expect(result).toEqual(deviceResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/device'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on error status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' });
    await expect(requestDeviceCode('cid')).rejects.toThrow('502');
  });
});

// ---------------------------------------------------------------------------
// pollForToken
// ---------------------------------------------------------------------------
describe('pollForToken', () => {
  it('resolves with access token on success', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ access_token: 'ghp_abc123' }),
    });

    const token = await pollForToken('cid', 'dc', 0.01);
    expect(token).toBe('ghp_abc123');
  });

  it('retries on authorization_pending then resolves', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => ({ error: 'authorization_pending' }) })
      .mockResolvedValueOnce({ json: async () => ({ access_token: 'ghp_ok' }) });

    const token = await pollForToken('cid', 'dc', 0.01);
    expect(token).toBe('ghp_ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects on expired_token', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ error: 'expired_token' }),
    });

    await expect(pollForToken('cid', 'dc', 0.01)).rejects.toThrow('expired');
  });

  it('rejects on access_denied', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ error: 'access_denied' }),
    });

    await expect(pollForToken('cid', 'dc', 0.01)).rejects.toThrow('denied');
  });

  it('respects AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(pollForToken('cid', 'dc', 0.01, controller.signal)).rejects.toThrow('Cancelled');
  });
});
