import { db } from '../../config/db.js';
import { decryptMoney, decryptRows, decryptSensitive, encryptMoney, encryptSensitive } from '../../shared/encryption.js';

const encryptMoneyFields = (data, fields) => Object.fromEntries(
  Object.entries(data).map(([field, value]) => [
    field,
    fields.includes(field) && value !== null && value !== undefined ? encryptMoney(value) : value
  ])
);

const encryptSensitiveFields = (data, fields) => Object.fromEntries(
  Object.entries(data).map(([field, value]) => [
    field,
    fields.includes(field) && value !== null && value !== undefined ? encryptSensitive(value) : value
  ])
);

const decryptMoneyRow = (row, fields) => {
  if (!row) return row;
  return Object.fromEntries(Object.entries(row).map(([field, value]) => [
    field,
    fields.includes(field) && value !== null && value !== undefined ? decryptMoney(value) : value
  ]));
};

const decryptSensitiveFields = (row, fields) => {
  if (!row) return row;
  return Object.fromEntries(Object.entries(row).map(([field, value]) => [
    field,
    fields.includes(field) && value !== null && value !== undefined ? decryptSensitive(value) : value
  ]));
};

export const personalFinanceRepository = {
  // Wallets
  async getWalletsByUserId(userId, status = 'active') {
    const query = db('wallets').where({ user_id: userId });
    if (status) {
      query.where({ status });
    }
    const wallets = await query.select(
      'id',
      'user_id as userId',
      'name',
      'description',
      'balance',
      'status',
      'created_at as createdAt'
    ).orderBy('id', 'asc');
    return decryptRows(wallets, ['balance']);
  },

  async getWalletById(id, userId, trx = db) {
    const wallet = await trx('wallets')
      .where({ id, user_id: userId })
      .select('id', 'user_id as userId', 'name', 'description', 'balance', 'status')
      .first();
    return decryptMoneyRow(wallet, ['balance']);
  },

  async getWalletsForUpdate(ids, userId, trx) {
    const wallets = await trx('wallets')
      .whereIn('id', ids)
      .where({ user_id: userId })
      .orderBy('id', 'asc')
      .forUpdate();
    return decryptRows(wallets, ['balance']);
  },

  async createWallet(data, trx = db) {
    const [id] = await trx('wallets').insert(encryptMoneyFields(data, ['balance']));
    return id;
  },

  async updateWallet(id, userId, data, trx = db) {
    await trx('wallets').where({ id, user_id: userId })
      .update(encryptMoneyFields(data, ['balance']));
  },

  async hasWalletTransactions(walletId) {
    const tx = await db('transactions').where({ wallet_id: walletId }).first();
    if (tx) return true;
    const transfer = await db('wallet_transfers')
      .where('from_wallet_id', walletId)
      .orWhere('to_wallet_id', walletId)
      .first();
    return !!transfer;
  },

  async deleteWalletPermanent(id, userId) {
    await db('wallets').where({ id, user_id: userId }).del();
  },

  async createWalletTransfer(data, trx) {
    const encrypted = encryptMoneyFields(data, ['amount']);
    const [id] = await trx('wallet_transfers').insert(encryptSensitiveFields(encrypted, ['note']));
    return id;
  },

  // Categories
  async getCategories(userId, type = null) {
    const query = db('categories')
      .where({ user_id: userId, status: 'active' });
    if (type) {
      query.where({ type });
    }
    return query.select(
      'id',
      'user_id as userId',
      'name',
      'type',
      'icon',
      'status'
    ).orderBy('name', 'asc');
  },

  async findCategoryByName(userId, name, type) {
    return db('categories')
      .where({ user_id: userId, type, status: 'active' })
      .whereRaw('LOWER(name) = ?', [name.toLowerCase().trim()])
      .first();
  },

  async findCategoryById(id, userId, trx = db) {
    return trx('categories').where({ id, user_id: userId }).first();
  },

  async createCategory(data) {
    const [id] = await db('categories').insert(data);
    return id;
  },

  async updateCategory(id, userId, data) {
    await db('categories').where({ id, user_id: userId }).update(data);
  },

  async hasCategoryTransactions(categoryId) {
    const tx = await db('transactions').where({ category_id: categoryId }).first();
    return !!tx;
  },

  async deleteCategoryPermanent(id, userId) {
    await db('categories').where({ id, user_id: userId }).del();
  },

  async archiveCategory(id, userId) {
    await db('categories').where({ id, user_id: userId }).update({ status: 'archived' });
  },

  // Transactions
  async getTransactions(userId, { keyword, fromDate, toDate, walletId, categoryId, type, page = 1, limit = 20 }) {
    const query = db('transactions')
      .join('wallets', 'transactions.wallet_id', 'wallets.id')
      .join('categories', 'transactions.category_id', 'categories.id')
      .where('transactions.user_id', userId);

    if (fromDate) {
      query.where('transactions.occurred_on', '>=', fromDate);
    }
    if (toDate) {
      query.where('transactions.occurred_on', '<=', toDate);
    }
    if (walletId) {
      query.where('transactions.wallet_id', walletId);
    }
    if (categoryId) {
      query.where('transactions.category_id', categoryId);
    }
    if (type) {
      query.where('transactions.type', type);
    }

    const selectItems = (builder) => builder.select(
        'transactions.id',
        'transactions.user_id as userId',
        'transactions.name',
        'transactions.wallet_id as walletId',
        'wallets.name as walletName',
        'transactions.category_id as categoryId',
        'categories.name as categoryName',
        'categories.icon as categoryIcon',
        'transactions.type',
        'transactions.amount',
        'transactions.occurred_on as occurredOn',
        'transactions.note',
        'transactions.created_at as createdAt'
      );

    if (keyword) {
      const allItems = await selectItems(query.clone())
        .orderBy('transactions.occurred_on', 'desc')
        .orderBy('transactions.id', 'desc');
      const clearItems = decryptRows(allItems, ['amount'], ['name', 'note']);
      const normalizedKeyword = keyword.toLowerCase();
      const matchingItems = clearItems.filter((item) => (
        String(item.name || '').toLowerCase().includes(normalizedKeyword)
        || String(item.note || '').toLowerCase().includes(normalizedKeyword)
      ));
      const total = matchingItems.length;
      const items = matchingItems.slice((page - 1) * limit, page * limit);
      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    const countResult = await query.clone().count('transactions.id as total').first();
    const total = Number(countResult?.total || 0);
    const items = await selectItems(query)
      .orderBy('transactions.occurred_on', 'desc')
      .orderBy('transactions.id', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      items: decryptRows(items, ['amount'], ['name', 'note']),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  async getTransactionById(id, userId, trx = db) {
    const transaction = await trx('transactions')
      .where({ id, user_id: userId })
      .first();
    return decryptMoneyRow(decryptSensitiveFields(transaction, ['name', 'note']), ['amount']);
  },

  async getTransactionForUpdate(id, userId, trx) {
    const transaction = await trx('transactions')
      .where({ id, user_id: userId })
      .forUpdate()
      .first();
    return decryptMoneyRow(decryptSensitiveFields(transaction, ['name', 'note']), ['amount']);
  },

  async createTransaction(data, trx) {
    const encrypted = encryptMoneyFields(data, ['amount']);
    const [id] = await trx('transactions').insert(encryptSensitiveFields(encrypted, ['name', 'note']));
    return id;
  },

  async updateTransaction(id, userId, data, trx) {
    const encrypted = encryptMoneyFields(data, ['amount']);
    await trx('transactions').where({ id, user_id: userId })
      .update(encryptSensitiveFields(encrypted, ['name', 'note']));
  },

  async deleteTransaction(id, userId, trx = db) {
    await trx('transactions').where({ id, user_id: userId }).del();
  },

  async deleteTransactionsBatch(ids, userId, trx = db) {
    return trx('transactions')
      .whereIn('id', ids)
      .where({ user_id: userId })
      .del();
  },

  async getMonthlyExpenseTotal(userId, month, trx = db) {
    const rows = await trx('transactions')
      .where({ user_id: userId, type: 'expense' })
      .where('occurred_on', 'like', `${month}%`)
      .select('amount');

    return rows.reduce((total, row) => total + decryptMoney(row.amount), 0);
  },

  // Budgets
  async getBudgetByMonth(userId, month, trx = db) {
    const budget = await trx('budgets')
      .where({ user_id: userId, month })
      .first();
    return decryptMoneyRow(budget, ['amount']);
  },

  async getBudgetForUpdate(userId, month, trx) {
    const budget = await trx('budgets')
      .where({ user_id: userId, month })
      .forUpdate()
      .first();
    return decryptMoneyRow(budget, ['amount']);
  },

  async createBudget(data, trx = db) {
    const [id] = await trx('budgets').insert(encryptMoneyFields(data, ['amount']));
    return id;
  },

  async updateBudget(id, userId, data, trx = db) {
    await trx('budgets').where({ id, user_id: userId })
      .update(encryptMoneyFields(data, ['amount']));
  },

  async deleteBudget(id, userId) {
    await db('budgets').where({ id, user_id: userId }).del();
  },

  // Savings Goals
  async getSavingsGoals(userId) {
    const goals = await db('savings_goals')
      .where({ user_id: userId })
      .select(
        'id',
        'user_id as userId',
        'name',
        'target_amount as targetAmount',
        'current_amount as currentAmount',
        'target_date as targetDate',
        'status',
        'created_at as createdAt'
      )
      .orderBy('id', 'desc');
    return decryptRows(goals, ['targetAmount', 'currentAmount']);
  },

  async getSavingsGoalById(id, userId, trx = db) {
    const goal = await trx('savings_goals')
      .where({ id, user_id: userId })
      .first();
    return decryptMoneyRow(goal, ['target_amount', 'current_amount']);
  },

  async getSavingsGoalsForUpdate(ids, userId, trx) {
    const goals = await trx('savings_goals')
      .whereIn('id', ids)
      .where({ user_id: userId })
      .orderBy('id', 'asc')
      .forUpdate();
    return decryptRows(goals, ['target_amount', 'current_amount']);
  },

  async createSavingsGoal(data) {
    const [id] = await db('savings_goals').insert(encryptMoneyFields(data, ['target_amount', 'current_amount']));
    return id;
  },

  async updateSavingsGoal(id, userId, data, trx = db) {
    await trx('savings_goals').where({ id, user_id: userId })
      .update(encryptMoneyFields(data, ['target_amount', 'current_amount']));
  },

  async deleteSavingsGoal(id, userId, trx = db) {
    await trx('savings_goals').where({ id, user_id: userId }).del();
  },

  async recordSavingsMovement(data, trx = db) {
    const encrypted = encryptMoneyFields(data, ['amount']);
    await trx('savings_goal_movements').insert(encryptSensitiveFields(encrypted, ['note']));
  }
};
