import { personalFinanceService } from './personal-finance.service.js';

export const personalFinanceController = {
  // Wallets
  async getWallets(req, res, next) {
    try {
      const data = await personalFinanceService.getWallets(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async createWallet(req, res, next) {
    try {
      const wallet = await personalFinanceService.createWallet(req.user.id, req.body);
      res.status(201).json({
        data: wallet,
        meta: { message: 'Tạo ví thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateWallet(req, res, next) {
    try {
      const wallet = await personalFinanceService.updateWallet(req.user.id, Number(req.params.id), req.body);
      res.json({
        data: wallet,
        meta: { message: 'Cập nhật ví thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteWallet(req, res, next) {
    try {
      const result = await personalFinanceService.deleteWallet(req.user.id, Number(req.params.id));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async transfer(req, res, next) {
    try {
      const result = await personalFinanceService.transferBetweenWallets(req.user.id, req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  // Categories
  async getCategories(req, res, next) {
    try {
      const type = req.query.type || null;
      const categories = await personalFinanceService.getCategories(req.user.id, type);
      res.json({ data: categories });
    } catch (err) {
      next(err);
    }
  },

  async createCategory(req, res, next) {
    try {
      const category = await personalFinanceService.createCategory(req.user.id, req.body);
      res.status(201).json({ data: category });
    } catch (err) {
      next(err);
    }
  },

  async updateCategory(req, res, next) {
    try {
      const category = await personalFinanceService.updateCategory(req.user.id, Number(req.params.id), req.body);
      res.json({ data: category });
    } catch (err) {
      next(err);
    }
  },

  async deleteCategories(req, res, next) {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : [Number(req.body.id)];
      const result = await personalFinanceService.deleteCategories(req.user.id, ids);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  // Transactions
  async getTransactions(req, res, next) {
    try {
      const result = await personalFinanceService.getTransactions(req.user.id, {
        keyword: req.query.keyword,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        walletId: req.query.walletId ? Number(req.query.walletId) : undefined,
        categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
        type: req.query.type,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20
      });
      res.json({
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async createTransaction(req, res, next) {
    try {
      const tx = await personalFinanceService.createTransaction(req.user.id, req.body);
      res.status(201).json({
        data: tx,
        meta: { message: 'Thêm giao dịch thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateTransaction(req, res, next) {
    try {
      const tx = await personalFinanceService.updateTransaction(req.user.id, Number(req.params.id), req.body);
      res.json({
        data: tx,
        meta: { message: 'Cập nhật giao dịch thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteTransaction(req, res, next) {
    try {
      const result = await personalFinanceService.deleteTransaction(req.user.id, Number(req.params.id));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async deleteBatchTransactions(req, res, next) {
    try {
      const ids = req.body.ids;
      const result = await personalFinanceService.deleteTransactionsBatch(req.user.id, ids);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  // Budgets
  async getCurrentBudget(req, res, next) {
    try {
      const data = await personalFinanceService.getCurrentBudget(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async createBudget(req, res, next) {
    try {
      const budget = await personalFinanceService.createBudget(req.user.id, req.body);
      res.status(201).json({
        data: budget,
        meta: { message: 'Tạo hạn mức thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateBudget(req, res, next) {
    try {
      const budget = await personalFinanceService.updateBudget(req.user.id, Number(req.params.id), req.body);
      res.json({
        data: budget,
        meta: { message: 'Cập nhật hạn mức thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteBudget(req, res, next) {
    try {
      const result = await personalFinanceService.deleteBudget(req.user.id, Number(req.params.id));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  // Savings Goals
  async getSavingsGoals(req, res, next) {
    try {
      const data = await personalFinanceService.getSavingsGoals(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async createSavingsGoal(req, res, next) {
    try {
      const goal = await personalFinanceService.createSavingsGoal(req.user.id, req.body);
      res.status(201).json({
        data: goal,
        meta: { message: 'Thiết lập mục tiêu thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSavingsGoal(req, res, next) {
    try {
      const goal = await personalFinanceService.updateSavingsGoal(req.user.id, Number(req.params.id), req.body);
      res.json({
        data: goal,
        meta: { message: 'Cập nhật mục tiêu thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteSavingsGoal(req, res, next) {
    try {
      const refundWalletId = req.query.refundWalletId ? Number(req.query.refundWalletId) : null;
      const result = await personalFinanceService.deleteSavingsGoal(req.user.id, Number(req.params.id), refundWalletId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async depositSavingsGoal(req, res, next) {
    try {
      const result = await personalFinanceService.depositToSavingsGoal(req.user.id, Number(req.params.id), req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async transferSavingsGoals(req, res, next) {
    try {
      const result = await personalFinanceService.transferBetweenGoals(req.user.id, req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
};
