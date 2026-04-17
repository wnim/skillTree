import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGistConfig } from '../useGistConfig';
import { GIST_CONFIG_KEY } from '../../data/defaultData';

describe('useGistConfig', () => {
  it('returns null when no config is stored', () => {
    const { result } = renderHook(() => useGistConfig());
    expect(result.current.config).toBeNull();
  });

  it('loads valid config from localStorage', () => {
    const config = { gistId: 'g123', token: 'tok', filename: 'tree.json' };
    localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify(config));
    const { result } = renderHook(() => useGistConfig());
    expect(result.current.config).toEqual(config);
  });

  it('rejects config missing gistId or token', () => {
    localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify({ gistId: 'g123' }));
    const { result } = renderHook(() => useGistConfig());
    expect(result.current.config).toBeNull();
    // Should also have cleaned up localStorage
    expect(localStorage.getItem(GIST_CONFIG_KEY)).toBeNull();
  });

  it('setConfig persists and updates state', () => {
    const { result } = renderHook(() => useGistConfig());
    const config = { gistId: 'g1', token: 't1', filename: 'f.json' };
    act(() => {
      result.current.setConfig(config);
    });
    expect(result.current.config).toEqual(config);
    expect(JSON.parse(localStorage.getItem(GIST_CONFIG_KEY))).toEqual(config);
  });

  it('clearConfig removes from localStorage and sets null', () => {
    localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify({ gistId: 'g1', token: 't1' }));
    const { result } = renderHook(() => useGistConfig());
    act(() => {
      result.current.clearConfig();
    });
    expect(result.current.config).toBeNull();
    expect(localStorage.getItem(GIST_CONFIG_KEY)).toBeNull();
  });
});
