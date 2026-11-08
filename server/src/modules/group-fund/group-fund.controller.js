import { groupFundService } from './group-fund.service.js';

export const groupFundController = {
  async getFunds(req, res, next) {
    try {
      const funds = await groupFundService.getFunds(req.user.id);
      res.json({ data: funds });
    } catch (err) {
      next(err);
    }
  },

  async createFund(req, res, next) {
    try {
      const fund = await groupFundService.createFund(req.user.id, req.body);
      res.status(201).json({
        data: fund,
        meta: { message: 'Tạo quỹ nhóm thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async getFundDetail(req, res, next) {
    try {
      const detail = await groupFundService.getFundDetail(req.user.id, Number(req.params.id));
      res.json({ data: detail });
    } catch (err) {
      next(err);
    }
  },

  async updateFund(req, res, next) {
    try {
      const fund = await groupFundService.updateFund(req.user.id, Number(req.params.id), req.body);
      res.json({
        data: fund,
        meta: { message: 'Cập nhật quỹ thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async contribute(req, res, next) {
    try {
      const result = await groupFundService.contribute(req.user.id, Number(req.params.id), req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async createGoal(req, res, next) {
    try {
      const goal = await groupFundService.createGoal(req.user.id, Number(req.params.id), req.body);
      res.status(201).json({
        data: goal,
        meta: { message: 'Thiết lập mục tiêu thành công' }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateGoal(req, res, next) {
    try {
      const goal = await groupFundService.updateGoal(req.user.id, Number(req.params.id), Number(req.params.goalId), req.body);
      res.json({ data: goal });
    } catch (err) {
      next(err);
    }
  },

  async deleteGoal(req, res, next) {
    try {
      const result = await groupFundService.deleteGoal(req.user.id, Number(req.params.id), Number(req.params.goalId));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async completeGoal(req, res, next) {
    try {
      const result = await groupFundService.completeGoal(req.user.id, Number(req.params.id), Number(req.params.goalId));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async inviteUsers(req, res, next) {
    try {
      const result = await groupFundService.inviteUsers(req.user.id, Number(req.params.id), req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async getInviteLink(req, res, next) {
    try {
      const result = await groupFundService.getOrCreateInviteLink(req.user.id, Number(req.params.id));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async getPreviewJoin(req, res, next) {
    try {
      const result = await groupFundService.getPreviewJoin(req.params.token);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async joinByToken(req, res, next) {
    try {
      const result = await groupFundService.joinByToken(req.user.id, req.params.token);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async acceptInvitation(req, res, next) {
    try {
      const result = await groupFundService.respondInvitation(req.user.id, Number(req.params.invitationId), 'accept');
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async declineInvitation(req, res, next) {
    try {
      const result = await groupFundService.respondInvitation(req.user.id, Number(req.params.invitationId), 'decline');
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async transferOwner(req, res, next) {
    try {
      const result = await groupFundService.transferOwner(req.user.id, Number(req.params.id), req.body.newOwnerUserId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async leaveFund(req, res, next) {
    try {
      const result = await groupFundService.leaveFund(req.user.id, Number(req.params.id));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async dissolveFund(req, res, next) {
    try {
      const result = await groupFundService.dissolveFund(req.user.id, Number(req.params.id));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
};
