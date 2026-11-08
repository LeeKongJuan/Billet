import { personalFinanceRepository } from './personal-finance.repository.js';
import { db } from '../../config/db.js';
import { getCurrentMonthStr } from '../../shared/dates.js';
import { decryptMoney } from '../../shared/encryption.js';
import { insertNotification } from '../../shared/notification-storage.js';
import {
  createBadRequest,
  createNotFound,
  createConflict,
  createForbidden
} from '../../shared/errors.js';

function monthOf(dateValue) {
  return dateValue instanceof Date
    ? dateValue.toISOString().slice(0, 7)
    : String(dateValue).slice(0, 7);
}

export const personalFinanceService = {
  // Wallets
  async getWallets(userId) {
    const wallets = await personalFinanceRepository.getWalletsByUserId(userId, 'active');
    const totalAssets = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
    return { wallets, totalAssets };
  },

  async createWallet(userId, { name, description, initialBalance = 0 }) {
    if (initialBalance < 0) {
      throw createBadRequest('Số dư ban đầu không được nhỏ hơn 0', 'INVALID_INITIAL_BALANCE');
    }

    const walletId = await personalFinanceRepository.createWallet({
      user_id: userId,
      name: name.trim(),
      description: description?.trim() || null,
      balance: initialBalance,
      status: 'active'
    });

    return personalFinanceRepository.getWalletById(walletId, userId);
  },

  async updateWallet(userId, walletId, { name, description }) {
    const wallet = await personalFinanceRepository.getWalletById(walletId, userId);
    if (!wallet) {
      throw createNotFound('Không tìm thấy ví tiền');
    }

    await personalFinanceRepository.updateWallet(walletId, userId, {
      name: name.trim(),
      description: description?.trim() || null,
      updated_at: db.fn.now()
    });

    return personalFinanceRepository.getWalletById(walletId, userId);
  },

  async deleteWallet(userId, walletId) {
    const wallet = await personalFinanceRepository.getWalletById(walletId, userId);
    if (!wallet) {
      throw createNotFound('Không tìm thấy ví tiền');
    }

    const hasTx = await personalFinanceRepository.hasWalletTransactions(walletId);
    if (hasTx) {
      // Inactive wallet to preserve transaction history & reports
      await personalFinanceRepository.updateWallet(walletId, userId, {
        status: 'inactive',
        updated_at: db.fn.now()
      });
      return { message: 'Xóa ví thành công (đã chuyển sang trạng thái ngưng hoạt động)', status: 'inactive' };
    }

    await personalFinanceRepository.deleteWalletPermanent(walletId, userId);
    return { message: 'Xóa ví thành công', status: 'deleted' };
  },

  async transferBetweenWallets(userId, { fromWalletId, toWalletId, amount, note, transferredOn }) {
    if (fromWalletId === toWalletId) {
      throw createBadRequest('Ví nguồn và ví đích không được trùng nhau', 'SAME_WALLET_TRANSFER');
    }

    return db.transaction(async (trx) => {
      // Lock wallets ordered by id ascending to prevent deadlocks
      const ids = [fromWalletId, toWalletId].sort((a, b) => a - b);
      const lockedWallets = await personalFinanceRepository.getWalletsForUpdate(ids, userId, trx);

      if (lockedWallets.length !== 2) {
        throw createNotFound('Không tìm thấy ví nguồn hoặc ví đích');
      }

      const fromWallet = lockedWallets.find((w) => w.id === fromWalletId);
      const toWallet = lockedWallets.find((w) => w.id === toWalletId);

      if (fromWallet.status !== 'active' || toWallet.status !== 'active') {
        throw createBadRequest('Cả hai ví phải đang hoạt động', 'WALLET_INACTIVE');
      }

      const fromBalance = Number(fromWallet.balance);
      const toBalance = Number(toWallet.balance);
      if (fromBalance < amount) {
        throw createBadRequest('Số dư ví nguồn không đủ để thực hiện chuyển tiền', 'WALLET_INSUFFICIENT_BALANCE');
      }

      // Deduct from source and add to destination
      const newFromBalance = fromBalance - amount;
      const newToBalance = toBalance + amount;
      await personalFinanceRepository.updateWallet(fromWalletId, userId, {
        balance: newFromBalance,
        updated_at: trx.fn.now()
      }, trx);

      await personalFinanceRepository.updateWallet(toWalletId, userId, {
        balance: newToBalance,
        updated_at: trx.fn.now()
      }, trx);

      // Record transfer
      await personalFinanceRepository.createWalletTransfer({
        user_id: userId,
        from_wallet_id: fromWalletId,
        to_wallet_id: toWalletId,
        amount,
        note: note?.trim() || null,
        transferred_on: transferredOn
      }, trx);

      return {
        message: 'Chuyển tiền thành công',
        fromWallet: { id: fromWalletId, newBalance: newFromBalance },
        toWallet: { id: toWalletId, newBalance: newToBalance }
      };
    });
  },

  // Categories
  async getCategories(userId, type = null) {
    return personalFinanceRepository.getCategories(userId, type);
  },

  async createCategory(userId, { name, type, icon = 'tag' }) {
    const existing = await personalFinanceRepository.findCategoryByName(userId, name, type);
    if (existing) {
      throw createConflict('Tên danh mục này đã được đặt, vui lòng đặt tên khác', 'CATEGORY_NAME_EXISTS');
    }

    const catId = await personalFinanceRepository.createCategory({
      user_id: userId,
      name: name.trim(),
      type,
      icon,
      status: 'active'
    });

    return personalFinanceRepository.findCategoryById(catId, userId);
  },

  async updateCategory(userId, categoryId, { name }) {
    const cat = await personalFinanceRepository.findCategoryById(categoryId, userId);
    if (!cat) {
      throw createNotFound('Không tìm thấy danh mục');
    }

    const existing = await personalFinanceRepository.findCategoryByName(userId, name, cat.type);
    if (existing && existing.id !== categoryId) {
      throw createConflict('Tên danh mục này đã được đặt, vui lòng đặt tên khác', 'CATEGORY_NAME_EXISTS');
    }

    await personalFinanceRepository.updateCategory(categoryId, userId, {
      name: name.trim(),
      updated_at: db.fn.now()
    });

    return personalFinanceRepository.findCategoryById(categoryId, userId);
  },

  async deleteCategories(userId, categoryIds) {
    if (!categoryIds || categoryIds.length === 0) {
      throw createBadRequest('Vui lòng chọn danh mục để xóa');
    }

    for (const id of categoryIds) {
      const cat = await personalFinanceRepository.findCategoryById(id, userId);
      if (cat) {
        const hasTx = await personalFinanceRepository.hasCategoryTransactions(id);
        if (hasTx) {
          await personalFinanceRepository.archiveCategory(id, userId);
        } else {
          await personalFinanceRepository.deleteCategoryPermanent(id, userId);
        }
      }
    }

    return { message: 'Xóa danh mục thành công' };
  },

  // Transactions & Budget alerts
  async getTransactions(userId, filters) {
    return personalFinanceRepository.getTransactions(userId, filters);
  },

  async debitWallet(userId, walletId, amount, trx, insufficientMessage = 'Số dư ví không đủ để thực hiện giao dịch') {
    const [wallet] = await personalFinanceRepository.getWalletsForUpdate([walletId], userId, trx);
    if (!wallet || wallet.status !== 'active') {
      throw createBadRequest('Ví không tồn tại hoặc đã ngừng hoạt động', 'INVALID_WALLET');
    }

    const balance = Number(wallet.balance);
    if (balance < amount) {
      throw createBadRequest(insufficientMessage, 'WALLET_INSUFFICIENT_BALANCE');
    }

    const newBalance = balance - amount;
    await personalFinanceRepository.updateWallet(walletId, userId, {
      balance: newBalance,
      updated_at: trx.fn.now()
    }, trx);

    return { ...wallet, balance: newBalance };
  },

  async createTransaction(userId, { name, walletId, categoryId, type, amount, occurredOn, note }) {
    return db.transaction(async (trx) => {
      const [wallet] = await personalFinanceRepository.getWalletsForUpdate([walletId], userId, trx);
      if (!wallet || wallet.status !== 'active') {
        throw createBadRequest('Ví không tồn tại hoặc đã ngừng hoạt động', 'INVALID_WALLET');
      }

      const category = await personalFinanceRepository.findCategoryById(categoryId, userId, trx);
      if (!category || category.status !== 'active') {
        throw createBadRequest('Danh mục không tồn tại hoặc đã bị lưu trữ', 'INVALID_CATEGORY');
      }

      if (category.type !== type) {
        throw createBadRequest('Loại danh mục không khớp với loại giao dịch', 'CATEGORY_TYPE_MISMATCH');
      }

      const currentBalance = Number(wallet.balance);
      const balanceDiff = type === 'expense' ? -amount : amount;
      const newBalance = currentBalance + balanceDiff;
      if (newBalance < 0) {
        throw createBadRequest('Số dư ví không đủ để thực hiện giao dịch', 'WALLET_INSUFFICIENT_BALANCE');
      }

      if (type === 'expense') {
        const month = occurredOn.slice(0, 7);
        const budget = await personalFinanceRepository.getBudgetForUpdate(userId, month, trx);
        if (budget) {
          const spent = await personalFinanceRepository.getMonthlyExpenseTotal(userId, month, trx);
          if (amount > Number(budget.amount) - spent) {
            throw createBadRequest('Số tiền giao dịch vượt quá ngân sách còn lại trong tháng', 'BUDGET_EXCEEDED');
          }
        }
      }

      await personalFinanceRepository.updateWallet(walletId, userId, {
        balance: newBalance,
        updated_at: trx.fn.now()
      }, trx);

      // Insert transaction
      const txId = await personalFinanceRepository.createTransaction({
        user_id: userId,
        name: name.trim(),
        wallet_id: walletId,
        category_id: categoryId,
        type,
        amount,
        occurred_on: occurredOn,
        note: note?.trim() || null
      }, trx);

      // Check budget if expense
      if (type === 'expense') {
        const month = occurredOn.slice(0, 7);
        await this._checkBudgetAlert(userId, month, trx);
      }

      return personalFinanceRepository.getTransactionById(txId, userId, trx);
    });
  },

  async updateTransaction(userId, txId, { name, walletId, categoryId, type, amount, occurredOn, note }) {
    return db.transaction(async (trx) => {
      const oldTx = await personalFinanceRepository.getTransactionForUpdate(txId, userId, trx);
      if (!oldTx) {
        throw createNotFound('Không tìm thấy giao dịch');
      }

      const lockedWallets = await personalFinanceRepository.getWalletsForUpdate(
        [...new Set([oldTx.wallet_id, walletId])].sort((a, b) => a - b),
        userId,
        trx
      );
      const oldWallet = lockedWallets.find((wallet) => wallet.id === oldTx.wallet_id);
      const targetWallet = lockedWallets.find((wallet) => wallet.id === walletId);
      if (!targetWallet || targetWallet.status !== 'active') {
        throw createBadRequest('Ví không tồn tại hoặc đã ngừng hoạt động');
      }
      if (!oldWallet) {
        throw createNotFound('Không tìm thấy ví của giao dịch');
      }

      const targetCategory = await personalFinanceRepository.findCategoryById(categoryId, userId, trx);
      if (!targetCategory || targetCategory.status !== 'active') {
        throw createBadRequest('Danh mục không tồn tại hoặc đã bị lưu trữ');
      }
      if (targetCategory.type !== type) {
        throw createBadRequest('Loại danh mục không khớp với loại giao dịch', 'CATEGORY_TYPE_MISMATCH');
      }

      // Revert old impact on old wallet
      const oldAmount = Number(oldTx.amount);
      const oldRevert = oldTx.type === 'expense' ? oldAmount : -oldAmount;
      const targetImpact = type === 'expense' ? -amount : amount;
      const oldWalletFinalBalance = oldTx.wallet_id === walletId
        ? Number(oldWallet.balance) + oldRevert + targetImpact
        : Number(oldWallet.balance) + oldRevert;
      const targetWalletFinalBalance = oldTx.wallet_id === walletId
        ? oldWalletFinalBalance
        : Number(targetWallet.balance) + targetImpact;

      if (oldWalletFinalBalance < 0 || targetWalletFinalBalance < 0) {
        throw createBadRequest('Số dư ví không đủ để cập nhật giao dịch', 'WALLET_INSUFFICIENT_BALANCE');
      }

      if (type === 'expense') {
        const month = occurredOn.slice(0, 7);
        const budget = await personalFinanceRepository.getBudgetForUpdate(userId, month, trx);
        if (budget) {
          let spent = await personalFinanceRepository.getMonthlyExpenseTotal(userId, month, trx);
          if (oldTx.type === 'expense' && monthOf(oldTx.occurred_on) === month) {
            spent -= oldAmount;
          }
          if (amount > Number(budget.amount) - spent) {
            throw createBadRequest('Số tiền giao dịch vượt quá ngân sách còn lại trong tháng', 'BUDGET_EXCEEDED');
          }
        }
      }

      await personalFinanceRepository.updateWallet(oldTx.wallet_id, userId, {
        balance: oldWalletFinalBalance,
        updated_at: trx.fn.now()
      }, trx);
      if (oldTx.wallet_id !== walletId) {
        await personalFinanceRepository.updateWallet(walletId, userId, {
          balance: targetWalletFinalBalance,
          updated_at: trx.fn.now()
        }, trx);
      }

      // Update transaction record
      await personalFinanceRepository.updateTransaction(txId, userId, {
        name: name.trim(),
        wallet_id: walletId,
        category_id: categoryId,
        type,
        amount,
        occurred_on: occurredOn,
        note: note?.trim() || null,
        updated_at: trx.fn.now()
      }, trx);

      // Check budget alert for new/old month
      const newMonth = occurredOn.slice(0, 7);
      await this._checkBudgetAlert(userId, newMonth, trx);
      const oldMonth = monthOf(oldTx.occurred_on);
      if (oldMonth !== newMonth) {
        await this._checkBudgetAlert(userId, oldMonth, trx);
      }

      return personalFinanceRepository.getTransactionById(txId, userId, trx);
    });
  },

  async deleteTransaction(userId, txId) {
    return db.transaction(async (trx) => {
      const tx = await personalFinanceRepository.getTransactionForUpdate(txId, userId, trx);
      if (!tx) {
        throw createNotFound('Không tìm thấy giao dịch');
      }

      // Revert wallet impact
      const [wallet] = await personalFinanceRepository.getWalletsForUpdate([tx.wallet_id], userId, trx);
      if (wallet) {
        const amount = Number(tx.amount);
        if (tx.type === 'income' && Number(wallet.balance) < amount) {
          throw createBadRequest('Số dư ví không đủ để hoàn tác giao dịch thu này', 'WALLET_INSUFFICIENT_BALANCE');
        }
        const revertDiff = tx.type === 'expense' ? amount : -amount;
        await personalFinanceRepository.updateWallet(tx.wallet_id, userId, {
          balance: Number(wallet.balance) + revertDiff,
          updated_at: trx.fn.now()
        }, trx);
      }

      await personalFinanceRepository.deleteTransaction(txId, userId, trx);

      if (tx.type === 'expense') {
        const month = monthOf(tx.occurred_on);
        await this._checkBudgetAlert(userId, month, trx);
      }

      return { message: 'Xóa giao dịch thành công' };
    });
  },

  async deleteTransactionsBatch(userId, txIds) {
    if (!txIds || txIds.length === 0) {
      throw createBadRequest('Vui lòng chọn giao dịch để xóa');
    }

    return db.transaction(async (trx) => {
      const affectedExpenseMonths = new Set([getCurrentMonthStr()]);
      const sortedIds = [...new Set(txIds)].sort((a, b) => a - b);
      for (const id of sortedIds) {
        const tx = await personalFinanceRepository.getTransactionForUpdate(id, userId, trx);
        if (tx) {
          const [wallet] = await personalFinanceRepository.getWalletsForUpdate([tx.wallet_id], userId, trx);
          if (wallet) {
            const amount = Number(tx.amount);
            if (tx.type === 'income' && Number(wallet.balance) < amount) {
              throw createBadRequest('Số dư ví không đủ để hoàn tác giao dịch thu này', 'WALLET_INSUFFICIENT_BALANCE');
            }
            const revertDiff = tx.type === 'expense' ? amount : -amount;
            await personalFinanceRepository.updateWallet(tx.wallet_id, userId, {
              balance: Number(wallet.balance) + revertDiff,
              updated_at: trx.fn.now()
            }, trx);
          }
          if (tx.type === 'expense') {
            affectedExpenseMonths.add(monthOf(tx.occurred_on));
          }
          await personalFinanceRepository.deleteTransaction(id, userId, trx);
        }
      }

      for (const month of affectedExpenseMonths) {
        await this._checkBudgetAlert(userId, month, trx);
      }

      return { message: 'Xóa các giao dịch đã chọn thành công' };
    });
  },

  async _checkBudgetAlert(userId, month, trx) {
    const budget = await personalFinanceRepository.getBudgetByMonth(userId, month, trx);
    if (!budget) return;

    const totalExpense = await personalFinanceRepository.getMonthlyExpenseTotal(userId, month, trx);
    const ratio = totalExpense / budget.amount;

    if (ratio >= 0.9 && !budget.alert_sent_at) {
      // Trigger notification
      await insertNotification(trx, {
        user_id: userId,
        type: 'budget_alert',
        title: 'Cảnh báo ngân sách',
        content: `Bạn đã sử dụng vượt quá 90% hạn mức tháng ${month}! (Đã chi: ${totalExpense} / ${budget.amount})`,
        data: { month, spent: totalExpense, limit: budget.amount }
      });
      await personalFinanceRepository.updateBudget(budget.id, userId, {
        alert_sent_at: trx.fn.now()
      }, trx);
    } else if (ratio < 0.9 && budget.alert_sent_at) {
      // Reset alert so it can trigger again if expenses cross 90% later
      await personalFinanceRepository.updateBudget(budget.id, userId, {
        alert_sent_at: null
      }, trx);
    }
  },

  // Budgets
  async getCurrentBudget(userId) {
    const month = getCurrentMonthStr();
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const budget = await personalFinanceRepository.getBudgetByMonth(userId, month);
    const spent = await personalFinanceRepository.getMonthlyExpenseTotal(userId, month);
    const monthlyTransactions = await personalFinanceRepository.getTransactions(userId, {
      type: 'expense',
      fromDate: `${month}-01`,
      toDate: `${month}-${String(lastDay).padStart(2, '0')}`,
      limit: 100
    });

    // Get breakdown by category for this month
    const breakdownRows = await db('transactions')
      .join('categories', 'transactions.category_id', 'categories.id')
      .where('transactions.user_id', userId)
      .where('transactions.type', 'expense')
      .where('transactions.occurred_on', 'like', `${month}%`)
      .select(
        'categories.id',
        'categories.name',
        'categories.icon',
        'transactions.amount'
      );

    const categoryTotals = new Map();
    for (const row of breakdownRows) {
      const item = categoryTotals.get(row.id) || { id: row.id, name: row.name, icon: row.icon, amount: 0 };
      item.amount += decryptMoney(row.amount);
      categoryTotals.set(row.id, item);
    }
    const breakdown = Array.from(categoryTotals.values());

    const categoriesWithPercent = breakdown.map((item) => ({
      ...item,
      percentage: spent > 0 ? Math.round((item.amount / spent) * 100) : 0
    }));

    if (!budget) {
      return {
        hasBudget: false,
        month,
        spent,
        categories: categoriesWithPercent,
        transactions: monthlyTransactions.items
      };
    }

    const percent = Math.round((spent / budget.amount) * 100);
    return {
      hasBudget: true,
      budget: {
        id: budget.id,
        month: budget.month,
        amount: budget.amount,
        spent,
        remaining: Math.max(0, budget.amount - spent),
        percentage: percent,
        isWarning: percent >= 90
      },
      categories: categoriesWithPercent,
      transactions: monthlyTransactions.items
    };
  },

  async createBudget(userId, { month, amount }) {
    const targetMonth = month || getCurrentMonthStr();
    const existing = await personalFinanceRepository.getBudgetByMonth(userId, targetMonth);
    if (existing) {
      throw createConflict(`Hạn mức cho tháng ${targetMonth} đã tồn tại. Bạn có thể chỉnh sửa thay vì tạo mới.`, 'BUDGET_ALREADY_EXISTS');
    }

    const budgetId = await personalFinanceRepository.createBudget({
      user_id: userId,
      month: targetMonth,
      amount
    });

    return personalFinanceRepository.getBudgetByMonth(userId, targetMonth);
  },

  async updateBudget(userId, budgetId, { amount }) {
    const budget = await db('budgets').where({ id: budgetId, user_id: userId }).first();
    if (!budget) {
      throw createNotFound('Không tìm thấy hạn mức');
    }

    await personalFinanceRepository.updateBudget(budgetId, userId, {
      amount,
      updated_at: db.fn.now()
    });

    // Check budget alert after update
    await this._checkBudgetAlert(userId, budget.month, db);

    return personalFinanceRepository.getBudgetByMonth(userId, budget.month);
  },

  async deleteBudget(userId, budgetId) {
    const budget = await db('budgets').where({ id: budgetId, user_id: userId }).first();
    if (!budget) {
      throw createNotFound('Không tìm thấy hạn mức');
    }

    await personalFinanceRepository.deleteBudget(budgetId, userId);
    return { message: 'Xóa hạn mức thành công' };
  },

  // Savings Goals
  async getSavingsGoals(userId) {
    const goals = await personalFinanceRepository.getSavingsGoals(userId);
    const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
    return { goals, totalSaved };
  },

  async createSavingsGoal(userId, { name, targetAmount, targetDate }) {
    const goalId = await personalFinanceRepository.createSavingsGoal({
      user_id: userId,
      name: name.trim(),
      target_amount: targetAmount,
      current_amount: 0,
      target_date: targetDate,
      status: 'accumulating'
    });

    return personalFinanceRepository.getSavingsGoalById(goalId, userId);
  },

  async updateSavingsGoal(userId, goalId, { name, targetAmount, targetDate }) {
    const goal = await personalFinanceRepository.getSavingsGoalById(goalId, userId);
    if (!goal) {
      throw createNotFound('Không tìm thấy mục tiêu tiết kiệm');
    }

    await personalFinanceRepository.updateSavingsGoal(goalId, userId, {
      name: name.trim(),
      target_amount: targetAmount,
      target_date: targetDate,
      updated_at: db.fn.now()
    });

    return personalFinanceRepository.getSavingsGoalById(goalId, userId);
  },

  async deleteSavingsGoal(userId, goalId, refundWalletId) {
    return db.transaction(async (trx) => {
      const goal = await personalFinanceRepository.getSavingsGoalById(goalId, userId, trx);
      if (!goal) {
        throw createNotFound('Không tìm thấy mục tiêu tiết kiệm');
      }

      if (goal.current_amount > 0) {
        if (!refundWalletId) {
          throw createBadRequest('Vui lòng chọn ví hoàn trả số tiền đang có trong mục tiêu');
        }
        const [wallet] = await personalFinanceRepository.getWalletsForUpdate([refundWalletId], userId, trx);
        if (!wallet || wallet.status !== 'active') {
          throw createBadRequest('Ví hoàn trả không tồn tại hoặc đã ngừng hoạt động');
        }

        // Refund money back to selected wallet
        await personalFinanceRepository.updateWallet(refundWalletId, userId, {
          balance: Number(wallet.balance) + Number(goal.current_amount),
          updated_at: trx.fn.now()
        }, trx);

        await personalFinanceRepository.recordSavingsMovement({
          user_id: userId,
          source_type: 'savings_goal',
          source_id: goalId,
          dest_type: 'wallet',
          dest_id: refundWalletId,
          amount: goal.current_amount,
          note: `Hoàn tiền khi xóa mục tiêu "${goal.name}"`
        }, trx);
      }

      await personalFinanceRepository.deleteSavingsGoal(goalId, userId, trx);
      return { message: 'Xóa mục tiêu thành công' };
    });
  },

  async depositToSavingsGoal(userId, goalId, { walletId, amount, note }) {
    return db.transaction(async (trx) => {
      const goal = await personalFinanceRepository.getSavingsGoalById(goalId, userId, trx);
      if (!goal) {
        throw createNotFound('Không tìm thấy mục tiêu tiết kiệm');
      }

      const [wallet] = await personalFinanceRepository.getWalletsForUpdate([walletId], userId, trx);
      if (!wallet || wallet.status !== 'active') {
        throw createBadRequest('Ví không tồn tại hoặc đã ngừng hoạt động');
      }

      const walletBalance = Number(wallet.balance);
      if (walletBalance < amount) {
        throw createBadRequest('Số dư ví không đủ để nạp vào mục tiêu tiết kiệm');
      }

      // Deduct wallet, increase goal
      await personalFinanceRepository.updateWallet(walletId, userId, {
        balance: walletBalance - amount,
        updated_at: trx.fn.now()
      }, trx);

      const newGoalAmount = Number(goal.current_amount) + amount;
      const status = newGoalAmount >= Number(goal.target_amount) ? 'completed' : goal.status;

      await personalFinanceRepository.updateSavingsGoal(goalId, userId, {
        current_amount: newGoalAmount,
        status,
        updated_at: trx.fn.now()
      }, trx);

      await personalFinanceRepository.recordSavingsMovement({
        user_id: userId,
        source_type: 'wallet',
        source_id: walletId,
        dest_type: 'savings_goal',
        dest_id: goalId,
        amount,
        note: note?.trim() || `Nạp tiền từ ví ${wallet.name}`
      }, trx);

      return {
        message: 'Nạp tiền vào mục tiêu tiết kiệm thành công',
        goal: { id: goalId, currentAmount: newGoalAmount, status }
      };
    });
  },

  async transferBetweenGoals(userId, { fromGoalId, toGoalId, amount, note }) {
    if (fromGoalId === toGoalId) {
      throw createBadRequest('Mục tiêu nguồn và đích không được trùng nhau');
    }

    return db.transaction(async (trx) => {
      const ids = [fromGoalId, toGoalId].sort((a, b) => a - b);
      const lockedGoals = await personalFinanceRepository.getSavingsGoalsForUpdate(ids, userId, trx);

      if (lockedGoals.length !== 2) {
        throw createNotFound('Không tìm thấy mục tiêu nguồn hoặc mục tiêu đích');
      }

      const fromGoal = lockedGoals.find((g) => g.id === fromGoalId);
      const toGoal = lockedGoals.find((g) => g.id === toGoalId);

      const fromBalance = Number(fromGoal.current_amount);
      const toBalance = Number(toGoal.current_amount);
      const targetAmount = Number(toGoal.target_amount);
      if (fromBalance < amount) {
        throw createBadRequest('Số dư mục tiêu nguồn không đủ để chuyển');
      }

      const newFrom = fromBalance - amount;
      const newTo = toBalance + amount;

      await personalFinanceRepository.updateSavingsGoal(fromGoalId, userId, {
        current_amount: newFrom,
        updated_at: trx.fn.now()
      }, trx);

      await personalFinanceRepository.updateSavingsGoal(toGoalId, userId, {
        current_amount: newTo,
        status: newTo >= targetAmount ? 'completed' : toGoal.status,
        updated_at: trx.fn.now()
      }, trx);

      await personalFinanceRepository.recordSavingsMovement({
        user_id: userId,
        source_type: 'savings_goal',
        source_id: fromGoalId,
        dest_type: 'savings_goal',
        dest_id: toGoalId,
        amount,
        note: note?.trim() || `Chuyển từ "${fromGoal.name}" sang "${toGoal.name}"`
      }, trx);

      return {
        message: 'Chuyển tiền giữa các mục tiêu thành công',
        fromGoal: { id: fromGoalId, currentAmount: newFrom },
        toGoal: { id: toGoalId, currentAmount: newTo }
      };
    });
  }
};
