import { db } from '../../config/db.js';
import { getPeriodDateRange, getNowVietnam } from '../../shared/dates.js';
import { decryptMoney, decryptRows } from '../../shared/encryption.js';

export const reportsService = {
  async getOverview(userId, { period = 'this_month', walletId, fromDate, toDate }) {
    const range = getPeriodDateRange(period, fromDate, toDate);

    // 1. Total assets across active wallets
    const wallets = await db('wallets')
      .where({ user_id: userId, status: 'active' })
      .select('id', 'name', 'balance');
    const clearWallets = decryptRows(wallets, ['balance']);
    const totalAssets = clearWallets.reduce((sum, w) => sum + Number(w.balance), 0);

    // 2. Total income & expense in period
    const txQuery = db('transactions')
      .where({ user_id: userId })
      .where('occurred_on', '>=', range.fromDate)
      .where('occurred_on', '<=', range.toDate);

    if (walletId) {
      txQuery.where({ wallet_id: walletId });
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const transactions = await txQuery.select('type', 'amount');
    for (const transaction of transactions) {
      const amount = decryptMoney(transaction.amount);
      if (transaction.type === 'income') totalIncome += amount;
      if (transaction.type === 'expense') totalExpense += amount;
    }

    const netAmount = totalIncome - totalExpense;

    return {
      period,
      fromDate: range.fromDate,
      toDate: range.toDate,
      totalAssets,
      totalIncome,
      totalExpense,
      netAmount,
      wallets: clearWallets
    };
  },

  async getExpenseCategories(userId, { period = 'this_month', walletId, fromDate, toDate }) {
    const range = getPeriodDateRange(period, fromDate, toDate);

    const query = db('transactions')
      .join('categories', 'transactions.category_id', 'categories.id')
      .where('transactions.user_id', userId)
      .where('transactions.type', 'expense')
      .where('transactions.occurred_on', '>=', range.fromDate)
      .where('transactions.occurred_on', '<=', range.toDate);

    if (walletId) {
      query.where('transactions.wallet_id', walletId);
    }

    const rows = await query.select(
      'categories.id',
      'categories.name',
      'categories.icon',
      'transactions.amount'
    );
    const categoryTotals = new Map();
    for (const row of rows) {
      const entry = categoryTotals.get(row.id) || { ...row, amount: 0 };
      entry.amount += decryptMoney(row.amount);
      categoryTotals.set(row.id, entry);
    }
    const totals = Array.from(categoryTotals.values()).sort((a, b) => b.amount - a.amount);
    const totalExpense = totals.reduce((sum, row) => sum + row.amount, 0);

    const categories = totals.map((r) => {
      const amount = r.amount;
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        id: r.id,
        name: r.name,
        icon: r.icon,
        amount,
        percentage
      };
    });

    return { totalExpense, categories };
  },

  async getTrend(userId, { period = 'this_month', walletId, fromDate, toDate }) {
    const range = getPeriodDateRange(period, fromDate, toDate);

    const isYearly = period === 'this_year';

    const query = db('transactions')
      .where('transactions.user_id', userId)
      .where('transactions.occurred_on', '>=', range.fromDate)
      .where('transactions.occurred_on', '<=', range.toDate);

    if (walletId) {
      query.where('transactions.wallet_id', walletId);
    }

    const rows = await query.select('occurred_on', 'type', 'amount').orderBy('occurred_on', 'asc');

    const trendMap = new Map();

    for (const r of rows) {
      const occurredOn = r.occurred_on instanceof Date
        ? r.occurred_on.toISOString().slice(0, 10)
        : String(r.occurred_on).slice(0, 10);
      const label = isYearly ? occurredOn.slice(0, 7) : occurredOn;
      if (!trendMap.has(label)) {
        trendMap.set(label, { label, income: 0, expense: 0 });
      }
      const entry = trendMap.get(label);
      const amount = decryptMoney(r.amount);
      if (r.type === 'income') entry.income += amount;
      if (r.type === 'expense') entry.expense += amount;
    }

    const data = Array.from(trendMap.values());
    return { data };
  },

  async getComparison(userId, { period = 'this_month', walletId }) {
    // Current period overview
    const current = await this.getOverview(userId, { period, walletId });

    // Compare with previous period
    let prevPeriod = 'last_month';
    if (period === 'this_week') prevPeriod = 'custom'; // previous week
    if (period === 'this_year') prevPeriod = 'custom'; // previous year

    let prevFromDate;
    let prevToDate;

    if (period === 'this_month') {
      const range = getPeriodDateRange('last_month');
      prevFromDate = range.fromDate;
      prevToDate = range.toDate;
    } else {
      const now = getNowVietnam();
      const prevYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
      const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().slice(0, 10);
      prevFromDate = prevYearStart;
      prevToDate = prevYearEnd;
    }

    const prevOverview = await this.getOverview(userId, {
      period: 'custom',
      walletId,
      fromDate: prevFromDate,
      toDate: prevToDate
    });

    const incomeChange = prevOverview.totalIncome > 0
      ? Math.round(((current.totalIncome - prevOverview.totalIncome) / prevOverview.totalIncome) * 100)
      : 0;

    const expenseChange = prevOverview.totalExpense > 0
      ? Math.round(((current.totalExpense - prevOverview.totalExpense) / prevOverview.totalExpense) * 100)
      : 0;

    return {
      current: {
        totalIncome: current.totalIncome,
        totalExpense: current.totalExpense,
        netAmount: current.netAmount
      },
      previous: {
        totalIncome: prevOverview.totalIncome,
        totalExpense: prevOverview.totalExpense,
        netAmount: prevOverview.netAmount
      },
      changes: {
        incomeChange,
        expenseChange
      }
    };
  }
};
