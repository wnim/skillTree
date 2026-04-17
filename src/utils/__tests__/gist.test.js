import { describe, it, expect } from 'vitest';
import { extractGistId } from '../gist';

describe('extractGistId', () => {
  it('extracts ID from a full gist URL', () => {
    expect(extractGistId('https://gist.github.com/user/abc123def456')).toBe('abc123def456');
  });

  it('handles trailing slash', () => {
    expect(extractGistId('https://gist.github.com/user/abc123def456/')).toBe('abc123def456');
  });

  it('returns raw ID string as-is', () => {
    expect(extractGistId('abc123def456')).toBe('abc123def456');
  });

  it('trims whitespace', () => {
    expect(extractGistId('  abc123def456  ')).toBe('abc123def456');
  });
});
