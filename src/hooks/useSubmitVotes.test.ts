import { describe, it, expect } from 'vitest';
import { estimateHeldUnits } from './useSubmitVotes';
import { UNIT_VALUE } from '../utils/constants';

describe('estimateHeldUnits', () => {
  it('returns 0 for no shares', () => {
    expect(estimateHeldUnits(undefined)).toBe(0);
    expect(estimateHeldUnits(0n)).toBe(0);
  });

  it('estimates 1 unit (weak) from shares at curve 1:1 price', () => {
    expect(estimateHeldUnits(UNIT_VALUE)).toBe(1);
  });

  it('estimates 3 units (strong) from shares at curve 1:1 price', () => {
    expect(estimateHeldUnits(UNIT_VALUE * 3n)).toBe(3);
  });

  it('rounds small share-accounting dust to the nearest whole unit', () => {
    expect(estimateHeldUnits(UNIT_VALUE * 3n + 1n)).toBe(3);
    expect(estimateHeldUnits(UNIT_VALUE - 1n)).toBe(1);
  });
});
