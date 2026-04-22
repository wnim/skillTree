import { describe, it, expect } from 'vitest';
import { proficiencyColor } from '../score';

describe('proficiencyColor', () => {
  it('returns grey for null', () => {
    expect(proficiencyColor(null)).toBe('#999');
  });

  it('returns grey for undefined', () => {
    expect(proficiencyColor(undefined)).toBe('#999');
  });

  it('returns red hsl for score 0', () => {
    expect(proficiencyColor(0)).toBe('hsl(0, 90%, 55%)');
  });

  it('returns green hsl for score 10', () => {
    expect(proficiencyColor(10)).toBe('hsl(120, 90%, 55%)');
  });

  it('returns yellow hsl for score 5', () => {
    expect(proficiencyColor(5)).toBe('hsl(60, 90%, 55%)');
  });

  it('interpolates intermediate scores', () => {
    expect(proficiencyColor(3)).toBe('hsl(36, 90%, 55%)');
    expect(proficiencyColor(7)).toBe('hsl(84, 90%, 55%)');
  });
});
