/**
 * Helper utilities for VND currency calculations.
 * All amounts MUST be integers (VND has no decimals).
 */

export function parseVND(value) {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error('Số tiền phải là số nguyên');
    }
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/[^\d-]/g, '');
    const num = parseInt(cleaned, 10);
    if (Number.isNaN(num)) {
      throw new Error('Số tiền không hợp lệ');
    }
    return num;
  }

  throw new Error('Số tiền không hợp lệ');
}

export function formatVND(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
}
