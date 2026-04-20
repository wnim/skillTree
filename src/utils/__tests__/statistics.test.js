import { describe, it, expect } from 'vitest';
import { computeBasicStats, computeInvestmentValue } from '../statistics';

const node = (id, score) => ({
  id,
  label: id.toUpperCase(),
  score,
  tags: [],

  position: { x: 0, y: 0 },
});

const prereq = (id, from, to) => ({ id, from, to, type: 'prerequisite' });

describe('computeBasicStats', () => {
  it('counts score=0 nodes as not attempted', () => {
    const nodes = [node('a', 0), node('b', null), node('c', 5), node('d', 10)];
    const stats = computeBasicStats(nodes);
    expect(stats.notAttempted).toBe(2); // score 0 and null
    expect(stats.inProgress).toBe(1);  // score 5
    expect(stats.mastered).toBe(1);    // score 10
  });

  it('returns zeros for empty input', () => {
    expect(computeBasicStats([])).toEqual({ mastered: 0, inProgress: 0, notAttempted: 0 });
  });

  it('treats all score values 1–9 as in progress', () => {
    const nodes = [node('a', 1), node('b', 9)];
    const stats = computeBasicStats(nodes);
    expect(stats.inProgress).toBe(2);
    expect(stats.notAttempted).toBe(0);
    expect(stats.mastered).toBe(0);
  });
});

describe('computeInvestmentValue', () => {
  it('returns empty array for empty input', () => {
    expect(computeInvestmentValue([], [])).toEqual([]);
  });

  it('returns empty when all nodes are unattempted (score null)', () => {
    const nodes = [node('a', null), node('b', null)];
    const edges = [prereq('e1', 'a', 'b')];
    expect(computeInvestmentValue(nodes, edges)).toEqual([]);
  });

  it('returns empty when all nodes are mastered (score 10)', () => {
    const nodes = [node('a', 10), node('b', 10)];
    const edges = [prereq('e1', 'a', 'b')];
    expect(computeInvestmentValue(nodes, edges)).toEqual([]);
  });

  it('returns empty when eligible node has no descendants', () => {
    const nodes = [node('a', 5)];
    expect(computeInvestmentValue(nodes, [])).toEqual([]);
  });

  it('computes PIV for a simple chain A→B→C', () => {
    // A(8) → B(null) → C(null)
    // PIV(A) = (8/10) * (10/1 + 10/2) = 0.8 * 15 = 12
    const nodes = [node('a', 8), node('b', null), node('c', null)];
    const edges = [prereq('e1', 'a', 'b'), prereq('e2', 'b', 'c')];
    const result = computeInvestmentValue(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
    expect(result[0].piv).toBeCloseTo(12);
  });

  it('ignores non-prerequisite edges', () => {
    const nodes = [node('a', 8), node('b', null)];
    const edges = [{ id: 'e1', from: 'a', to: 'b', type: 'inspired_by' }];
    expect(computeInvestmentValue(nodes, edges)).toEqual([]);
  });

  it('returns at most top 3 nodes ranked by PIV descending', () => {
    // Build 4 eligible nodes each with one unattempted child
    // Higher score → higher readiness → higher PIV (same downstream)
    const nodes = [
      node('a', 9), node('a_child', null),
      node('b', 7), node('b_child', null),
      node('c', 5), node('c_child', null),
      node('d', 3), node('d_child', null),
    ];
    const edges = [
      prereq('e1', 'a', 'a_child'),
      prereq('e2', 'b', 'b_child'),
      prereq('e3', 'c', 'c_child'),
      prereq('e4', 'd', 'd_child'),
    ];
    const result = computeInvestmentValue(nodes, edges);
    expect(result).toHaveLength(3);
    // PIV: a=0.9*10=9, b=0.7*10=7, c=0.5*10=5, d=0.3*10=3
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
    expect(result[2].id).toBe('c');
    expect(result[0].piv).toBeCloseTo(9);
    expect(result[1].piv).toBeCloseTo(7);
    expect(result[2].piv).toBeCloseTo(5);
  });

  it('accounts for partial-score descendant potential', () => {
    // A(8) → B(7): potential(B)=3, PIV(A) = 0.8 * (3/1) = 2.4
    // A(8) → B(7): potential(B)=3, PIV(A) = 0.8 * (3/1) = 2.4
    // B(7) qualifies (score 1-9) but has no descendants → PIV=0 → excluded
    const nodes = [node('a', 8), node('b', 7)];
    const edges = [prereq('e1', 'a', 'b')];
    const result = computeInvestmentValue(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
    expect(result[0].piv).toBeCloseTo(2.4);
  });

  it('excludes node when only descendant is mastered (potential=0)', () => {
    // A(8) → B(10): potential(B)=0, sum=0, PIV(A)=0 → excluded
    const nodes = [node('a', 8), node('b', 10)];
    const edges = [prereq('e1', 'a', 'b')];
    expect(computeInvestmentValue(nodes, edges)).toEqual([]);
  });

  it('handles cycles without infinite loop', () => {
    // A(8) → B(5) → A (cycle)
    const nodes = [node('a', 8), node('b', 5)];
    const edges = [prereq('e1', 'a', 'b'), prereq('e2', 'b', 'a')];
    const result = computeInvestmentValue(nodes, edges);
    // Should terminate. A→B: PIV(A) = 0.8*(5/1) = 4
    // B→A: PIV(B) = 0.5*(2/1) = 1
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[0].piv).toBeCloseTo(4);
    expect(result[1].id).toBe('b');
    expect(result[1].piv).toBeCloseTo(1);
  });

  it('applies distance decay for deeper descendants', () => {
    // A(6) → B(null) → C(null) → D(null)
    // PIV(A) = 0.6 * (10/1 + 10/2 + 10/3) = 0.6 * (10 + 5 + 3.333...) = 0.6 * 18.333... ≈ 11
    const nodes = [node('a', 6), node('b', null), node('c', null), node('d', null)];
    const edges = [prereq('e1', 'a', 'b'), prereq('e2', 'b', 'c'), prereq('e3', 'c', 'd')];
    const result = computeInvestmentValue(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
    expect(result[0].piv).toBeCloseTo(0.6 * (10 + 5 + 10 / 3));
  });

  it('handles branching — multiple children at same depth', () => {
    // A(8) → B(null), A → C(null)
    // PIV(A) = 0.8 * (10/1 + 10/1) = 16
    const nodes = [node('a', 8), node('b', null), node('c', null)];
    const edges = [prereq('e1', 'a', 'b'), prereq('e2', 'a', 'c')];
    const result = computeInvestmentValue(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
    expect(result[0].piv).toBeCloseTo(16);
  });
});
