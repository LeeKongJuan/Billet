export const TIMEZONE = 'Asia/Ho_Chi_Minh';

export function getNowVietnam() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

export function getCurrentMonthStr() {
  const now = getNowVietnam();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatDateVN(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getPeriodDateRange(period, customFrom, customTo) {
  const now = getNowVietnam();
  let fromDate;
  let toDate;

  switch (period) {
    case 'this_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      fromDate = monday.toISOString().slice(0, 10);
      toDate = sunday.toISOString().slice(0, 10);
      break;
    }
    case 'last_month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      fromDate = firstDay.toISOString().slice(0, 10);
      toDate = lastDay.toISOString().slice(0, 10);
      break;
    }
    case 'this_year': {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      fromDate = firstDay.toISOString().slice(0, 10);
      toDate = lastDay.toISOString().slice(0, 10);
      break;
    }
    case 'custom': {
      fromDate = customFrom;
      toDate = customTo;
      break;
    }
    case 'this_month':
    default: {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      fromDate = firstDay.toISOString().slice(0, 10);
      toDate = lastDay.toISOString().slice(0, 10);
      break;
    }
  }

  return { fromDate, toDate };
}
