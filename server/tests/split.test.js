import { describe, it, expect } from 'vitest';
import { calculateEqualShares, validateCustomShares } from '../src/modules/bill-split/algorithms/split.js';

describe('Bill Split Algorithm: calculateEqualShares', () => {
  it('splits 100.000 VND among 3 participants with remainder 1 VND to first remainder participants', () => {
    const totalAmount = 100000;
    const participantIds = [1, 2, 3];
    const shares = calculateEqualShares(totalAmount, participantIds);

    expect(shares[1]).toBe(33334);
    expect(shares[2]).toBe(33333);
    expect(shares[3]).toBe(33333);

    // Sum must equal totalAmount exactly
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalAmount);
  });

  it('splits evenly when total is perfectly divisible', () => {
    const totalAmount = 600000;
    const participantIds = [10, 20, 30];
    const shares = calculateEqualShares(totalAmount, participantIds);

    expect(shares[10]).toBe(200000);
    expect(shares[20]).toBe(200000);
    expect(shares[30]).toBe(200000);
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(totalAmount);
  });

  it('throws error when participants list is empty', () => {
    expect(() => calculateEqualShares(100000, [])).toThrow();
  });
});

describe('Bill Split Algorithm: validateCustomShares', () => {
  it('validates correct custom shares sum', () => {
    const totalAmount = 300000;
    const shares = { 1: 100000, 2: 50000, 3: 150000 };
    expect(validateCustomShares(totalAmount, shares)).toBe(true);
  });

  it('throws error when custom shares sum does not match total', () => {
    const totalAmount = 300000;
    const shares = { 1: 100000, 2: 50000, 3: 100000 }; // 250k != 300k
    expect(() => validateCustomShares(totalAmount, shares)).toThrow(
      'Tổng số tiền của các người tham gia không bằng tổng số tiền của hoạt động'
    );
  });
});
