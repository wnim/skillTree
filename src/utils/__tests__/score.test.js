import { describe, it, expect } from 'vitest';
import { scoreColor } from '../score';

describe('scoreColor', () => {
  it('returns grey for null', () => {
    expect(scoreColor(null)).toBe('#999');
  });

  it('returns grey for undefined', () => {
    expect(scoreColor(undefined)).toBe('#999');
  });

  it('returns red hsl for score 0', () => {
    expect(scoreColor(0)).toBe('hsl(0, 90%, 55%)');
  });

  it('returns green hsl for score 10', () => {
    expect(scoreColor(10)).toBe('hsl(120, 90%, 55%)');
  });

  it('returns yellow hsl for score 5', () => {
    expect(scoreColor(5)).toBe('hsl(60, 90%, 55%)');
  });

  it('interpolates intermediate scores', () => {
    expect(scoreColor(3)).toBe('hsl(36, 90%, 55%)');
    expect(scoreColor(7)).toBe('hsl(84, 90%, 55%)');
  });
});
