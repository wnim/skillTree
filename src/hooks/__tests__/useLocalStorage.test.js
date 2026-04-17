import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  it('initializes with default value when key is absent', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 42));
    expect(result.current[0]).toBe(42);
  });

  it('initializes from localStorage when key is present', () => {
    localStorage.setItem('test_key', JSON.stringify('saved'));
    const { result } = renderHook(() => useLocalStorage('test_key', 'default'));
    expect(result.current[0]).toBe('saved');
  });

  it('falls back to default on corrupted JSON', () => {
    localStorage.setItem('test_key', '{broken');
    const { result } = renderHook(() => useLocalStorage('test_key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('writes to localStorage on state change', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'initial'));
    act(() => {
      result.current[1]('updated');
    });
    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(localStorage.getItem('test_key'))).toBe('updated');
  });
});
