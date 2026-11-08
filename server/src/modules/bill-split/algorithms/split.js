/**
 * Split an activity's total amount among participants.
 * Equal split: distributes remainder 1 VND to first remainder participants sorted by id ascending.
 * Custom split: validates that sum of shares equals total amount.
 */

export function calculateEqualShares(totalAmount, participantIds) {
  if (!participantIds || participantIds.length === 0) {
    throw new Error('Danh sách người tham gia không được rỗng');
  }

  if (totalAmount <= 0) {
    throw new Error('Tổng số tiền hoạt động phải lớn hơn 0');
  }

  // Sort participant IDs ascending to ensure deterministic distribution of remainder
  const sortedIds = [...participantIds].sort((a, b) => a - b);
  const n = sortedIds.length;
  const base = Math.floor(totalAmount / n);
  const remainder = totalAmount % n;

  const shares = {};
  for (let i = 0; i < n; i++) {
    const id = sortedIds[i];
    shares[id] = base + (i < remainder ? 1 : 0);
  }

  return shares;
}

export function validateCustomShares(totalAmount, shares) {
  let sum = 0;
  for (const [id, amount] of Object.entries(shares)) {
    if (amount < 0 || !Number.isInteger(amount)) {
      throw new Error(`Số tiền của người tham gia ${id} không hợp lệ`);
    }
    sum += amount;
  }

  if (sum !== totalAmount) {
    throw new Error('Tổng số tiền của các người tham gia không bằng tổng số tiền của hoạt động');
  }

  return true;
}
