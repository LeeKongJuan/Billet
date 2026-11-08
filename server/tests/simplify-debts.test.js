import { describe, it, expect } from 'vitest';
import { calculateNetBalances, simplifyDebts } from '../src/modules/bill-split/algorithms/simplify-debts.js';

describe('Debt Simplification Algorithm: simplifyDebts', () => {
  it('simplifies circular debt A -> B -> C -> A to 0 transactions', () => {
    // A paid 100k for B; B paid 100k for C; C paid 100k for A
    const activities = [
      { paidByParticipantId: 1, totalAmount: 100000, shares: [{ participantId: 2, amount: 100000 }] },
      { paidByParticipantId: 2, totalAmount: 100000, shares: [{ participantId: 3, amount: 100000 }] },
      { paidByParticipantId: 3, totalAmount: 100000, shares: [{ participantId: 1, amount: 100000 }] }
    ];

    const net = calculateNetBalances(activities, [1, 2, 3]);
    expect(net[1]).toBe(0);
    expect(net[2]).toBe(0);
    expect(net[3]).toBe(0);

    const settlements = simplifyDebts(net);
    expect(settlements).toHaveLength(0);
  });

  it('correctly simplifies the mockup scenario from Billet PDF report', () => {
    // 1: Tuấn, 2: Việt, 3: Linh
    // Activity 1: 600k paid by Tuấn, split equal 3
    // Activity 2: 300k paid by Việt, custom: Tuấn 100k, Việt 50k, Linh 150k
    const activities = [
      {
        paidByParticipantId: 1,
        totalAmount: 600000,
        shares: [
          { participantId: 1, amount: 200000 },
          { participantId: 2, amount: 200000 },
          { participantId: 3, amount: 200000 }
        ]
      },
      {
        paidByParticipantId: 2,
        totalAmount: 300000,
        shares: [
          { participantId: 1, amount: 100000 },
          { participantId: 2, amount: 50000 },
          { participantId: 3, amount: 150000 }
        ]
      }
    ];

    const net = calculateNetBalances(activities, [1, 2, 3]);
    expect(net[1]).toBe(300000); // Tuấn receives 300k
    expect(net[2]).toBe(50000);  // Việt receives 50k
    expect(net[3]).toBe(-350000); // Linh pays 350k

    const sumNet = Object.values(net).reduce((a, b) => a + b, 0);
    expect(sumNet).toBe(0);

    const settlements = simplifyDebts(net);
    expect(settlements).toHaveLength(2); // <= n - 1 = 2
    expect(settlements[0]).toEqual({
      fromParticipantId: 3,
      toParticipantId: 1,
      amount: 300000
    });
    expect(settlements[1]).toEqual({
      fromParticipantId: 3,
      toParticipantId: 2,
      amount: 50000
    });
  });

  it('handles empty activities with empty settlements', () => {
    const net = calculateNetBalances([], [1, 2, 3]);
    const settlements = simplifyDebts(net);
    expect(settlements).toHaveLength(0);
  });
});
