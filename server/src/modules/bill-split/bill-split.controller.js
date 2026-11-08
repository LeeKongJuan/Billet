import { billSplitService } from './bill-split.service.js';

export const billSplitController = {
  async getBills(req, res, next) {
    try {
      const bills = await billSplitService.getBills(req.user.id);
      res.json({ data: bills });
    } catch (err) {
      next(err);
    }
  },

  async createBill(req, res, next) {
    try {
      const bill = await billSplitService.createBill(req.user.id, req.user.displayName, req.body);
      res.status(201).json({
        data: bill,
        meta: { message: 'Tạo hóa đơn thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async getBillDetail(req, res, next) {
    try {
      const detail = await billSplitService.getBillDetail(req.user.id, Number(req.params.id));
      res.json({ data: detail });
    } catch (err) {
      next(err);
    }
  },

  async addActivity(req, res, next) {
    try {
      const result = await billSplitService.addActivity(req.user.id, Number(req.params.id), req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async closeBill(req, res, next) {
    try {
      const result = await billSplitService.closeBill(req.user.id, Number(req.params.id));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async updateSettlementPaid(req, res, next) {
    try {
      const result = await billSplitService.updateSettlementPaid(
        req.user.id,
        Number(req.params.id),
        Number(req.params.settlementId),
        req.body.isPaid
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
};
