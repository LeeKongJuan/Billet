import { reportsService } from './reports.service.js';

export const reportsController = {
  async getOverview(req, res, next) {
    try {
      const data = await reportsService.getOverview(req.user.id, {
        period: req.query.period,
        walletId: req.query.walletId ? Number(req.query.walletId) : undefined,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getExpenseCategories(req, res, next) {
    try {
      const data = await reportsService.getExpenseCategories(req.user.id, {
        period: req.query.period,
        walletId: req.query.walletId ? Number(req.query.walletId) : undefined,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getTrend(req, res, next) {
    try {
      const data = await reportsService.getTrend(req.user.id, {
        period: req.query.period,
        walletId: req.query.walletId ? Number(req.query.walletId) : undefined,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getComparison(req, res, next) {
    try {
      const data = await reportsService.getComparison(req.user.id, {
        period: req.query.period,
        walletId: req.query.walletId ? Number(req.query.walletId) : undefined
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
};
