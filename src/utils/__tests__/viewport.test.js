import { describe, it, expect } from 'vitest';
import { loadViewport, saveViewport } from '../viewport';
import { VIEWPORT_KEY } from '../../data/defaultData';

describe('saveViewport', () => {
  it('writes JSON to localStorage under the correct key', () => {
    const viewport = { x: 100, y: 200, zoom: 1.5 };
    saveViewport(viewport);
    expect(JSON.parse(localStorage.getItem(VIEWPORT_KEY))).toEqual(viewport);
  });
});

describe('loadViewport', () => {
  it('returns parsed viewport when present', () => {
    const viewport = { x: 50, y: -30, zoom: 0.8 };
    localStorage.setItem(VIEWPORT_KEY, JSON.stringify(viewport));
    expect(loadViewport()).toEqual(viewport);
  });

  it('returns null when key is missing', () => {
    expect(loadViewport()).toBeNull();
  });

  it('returns null on corrupted JSON', () => {
    localStorage.setItem(VIEWPORT_KEY, '{broken');
    expect(loadViewport()).toBeNull();
  });
});
