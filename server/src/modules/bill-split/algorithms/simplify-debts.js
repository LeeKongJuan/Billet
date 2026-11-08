/**
 * Simplifies mutual debts among participants into minimal number of transactions (<= n - 1).
 * 
 * @param {Array<{ paidByParticipantId: number, totalAmount: number, shares: Array<{ participantId: number, amount: number }> }>} activities
 * @param {Array<number>} allParticipantIds
 * @returns {Array<{ fromParticipantId: number, toParticipantId: number, amount: number }>}
 */
export function calculateNetBalances(activities, allParticipantIds = []) {
  const net = {};

  // Initialize all participants to 0
  for (const id of allParticipantIds) {
    net[id] = 0;
  }

  // Calculate net balances
  for (const act of activities) {
    const payerId = act.paidByParticipantId;
    if (net[payerId] === undefined) net[payerId] = 0;
    net[payerId] += act.totalAmount;

    for (const share of act.shares) {
      if (net[share.participantId] === undefined) net[share.participantId] = 0;
      net[share.participantId] -= share.amount;
    }
  }

  return net;
}

export function simplifyDebts(netBalances) {
  // Creditors: net > 0 (sorted descending by amount, tie break by id ascending)
  const creditors = [];
  // Debtors: net < 0 (sorted descending by absolute amount, tie break by id ascending)
  const debtors = [];

  for (const [idStr, balance] of Object.entries(netBalances)) {
    const id = Number(idStr);
    if (balance > 0) {
      creditors.push({ id, amount: balance });
    } else if (balance < 0) {
      debtors.push({ id, amount: Math.abs(balance) });
    }
  }

  // Sort function
  const sortDesc = (a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.id - b.id;
  };

  creditors.sort(sortDesc);
  debtors.sort(sortDesc);

  const settlements = [];

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const t = Math.min(debtor.amount, creditor.amount);

    if (t > 0) {
      settlements.push({
        fromParticipantId: debtor.id,
        toParticipantId: creditor.id,
        amount: t
      });

      debtor.amount -= t;
      creditor.amount -= t;
    }

    if (debtor.amount === 0) {
      dIdx++;
    }
    if (creditor.amount === 0) {
      cIdx++;
    }
  }

  return settlements;
}
