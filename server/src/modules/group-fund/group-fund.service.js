import crypto from 'crypto';
import { groupFundRepository } from './group-fund.repository.js';
import { personalFinanceService } from '../personal-finance/personal-finance.service.js';
import { db } from '../../config/db.js';
import { insertNotification } from '../../shared/notification-storage.js';
import {
  createBadRequest,
  createNotFound,
  createForbidden,
  createConflict
} from '../../shared/errors.js';

const INVITATION_EXPIRY_DAYS = 7;

export const groupFundService = {
  async getFunds(userId) {
    return groupFundRepository.getFundsByUserId(userId);
  },

  async createFund(userId, { name, description, icon = 'users' }) {
    return db.transaction(async (trx) => {
      const fundId = await groupFundRepository.createFund({
        name: name.trim(),
        description: description?.trim() || null,
        icon,
        balance: 0,
        status: 'active'
      }, trx);

      await groupFundRepository.addMember(fundId, userId, 'owner', trx);

      return groupFundRepository.getFundById(fundId, trx);
    });
  },

  async getFundDetail(userId, fundId) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member) {
      throw createForbidden('Bạn không có quyền truy cập quỹ này');
    }

    const fund = await groupFundRepository.getFundById(fundId);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    const members = await groupFundRepository.getMembers(fundId);
    const goals = await groupFundRepository.getGoals(fundId);
    const transactions = await groupFundRepository.getTransactions(fundId);

    // Calculate overall progress: fund.balance / sum(accumulating goals)
    const activeGoals = goals.filter((g) => g.status === 'accumulating');
    const totalGoalAmount = activeGoals.reduce((sum, g) => sum + Number(g.targetAmount), 0);
    const overallProgress = totalGoalAmount > 0
      ? Math.min(100, Math.round((Number(fund.balance) / totalGoalAmount) * 100))
      : 0;

    return {
      fund: {
        ...fund,
        userRole: member.role,
        overallProgress,
        totalGoalAmount
      },
      members,
      goals,
      transactions
    };
  },

  async updateFund(userId, fundId, { name, description }) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member || member.role !== 'owner') {
      throw createForbidden('Chỉ Chủ quỹ mới có quyền chỉnh sửa thông tin quỹ');
    }

    const fund = await groupFundRepository.getFundById(fundId);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    await groupFundRepository.updateFund(fundId, {
      name: name.trim(),
      description: description?.trim() || null,
      updated_at: db.fn.now()
    });

    return groupFundRepository.getFundById(fundId);
  },

  async contribute(userId, fundId, { amount, walletId, note }) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member) {
      throw createForbidden('Bạn không phải thành viên của quỹ này');
    }

    return db.transaction(async (trx) => {
      const fund = await groupFundRepository.getFundForUpdate(fundId, trx);
      if (!fund || fund.status === 'dissolved') {
        throw createBadRequest('Quỹ này không còn hoạt động');
      }

      await personalFinanceService.debitWallet(
        userId,
        walletId,
        amount,
        trx,
        'Số dư ví không đủ để đóng góp vào quỹ'
      );

      const newBalance = Number(fund.balance) + amount;
      await groupFundRepository.updateFund(fundId, {
        balance: newBalance,
        updated_at: trx.fn.now()
      }, trx);

      const today = new Date().toISOString().slice(0, 10);
      await groupFundRepository.createTransaction({
        group_fund_id: fundId,
        user_id: userId,
        wallet_id: walletId || null,
        type: 'contribution',
        amount,
        note: note?.trim() || null,
        occurred_on: today
      }, trx);

      return {
        message: 'Đóng góp thành công',
        newBalance
      };
    });
  },

  async createGoal(userId, fundId, { name, targetAmount, targetDate }) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member) {
      throw createForbidden('Bạn không phải thành viên của quỹ này');
    }

    const fund = await groupFundRepository.getFundById(fundId);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    const goalId = await groupFundRepository.createGoal({
      group_fund_id: fundId,
      name: name.trim(),
      target_amount: targetAmount,
      target_date: targetDate || null,
      status: 'accumulating'
    });

    return groupFundRepository.getGoalById(fundId, goalId);
  },

  async updateGoal(userId, fundId, goalId, { name, targetAmount, targetDate }) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member) {
      throw createForbidden('Bạn không có quyền chỉnh sửa');
    }

    const fund = await groupFundRepository.getFundById(fundId);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    await groupFundRepository.updateGoal(goalId, fundId, {
      name: name.trim(),
      target_amount: targetAmount,
      target_date: targetDate || null,
      updated_at: db.fn.now()
    });

    return groupFundRepository.getGoalById(fundId, goalId);
  },

  async deleteGoal(userId, fundId, goalId) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member) {
      throw createForbidden('Bạn không có quyền xóa mục tiêu');
    }

    await groupFundRepository.deleteGoal(goalId, fundId);
    return { message: 'Xóa mục tiêu thành công' };
  },

  async completeGoal(userId, fundId, goalId) {
    return db.transaction(async (trx) => {
      const member = await groupFundRepository.getMember(fundId, userId, trx);
      if (!member) {
        throw createForbidden('Bạn không phải thành viên quỹ');
      }

      const fund = await groupFundRepository.getFundForUpdate(fundId, trx);
      if (!fund || fund.status === 'dissolved') {
        throw createBadRequest('Quỹ này không còn hoạt động');
      }

      const goal = await groupFundRepository.getGoalById(fundId, goalId, trx);
      if (!goal) {
        throw createNotFound('Mục tiêu không tồn tại');
      }

      if (goal.status === 'completed') {
        throw createBadRequest('Mục tiêu này đã được hoàn thành');
      }

      if (Number(fund.balance) <= Number(goal.target_amount)) {
        throw createBadRequest('Số dư quỹ phải lớn hơn số tiền mục tiêu để hoàn thành', 'FUND_BALANCE_NOT_ENOUGH');
      }

      const deductAmount = Number(goal.target_amount);
      const newBalance = Number(fund.balance) - deductAmount;

      await groupFundRepository.updateFund(fundId, {
        balance: newBalance,
        updated_at: trx.fn.now()
      }, trx);

      await groupFundRepository.updateGoal(goalId, fundId, {
        status: 'completed',
        updated_at: trx.fn.now()
      }, trx);

      const today = new Date().toISOString().slice(0, 10);
      await groupFundRepository.createTransaction({
        group_fund_id: fundId,
        user_id: userId,
        type: 'goal_completion',
        amount: deductAmount,
        note: `Hoàn thành mục tiêu: ${goal.name}`,
        occurred_on: today,
        goal_id: goalId
      }, trx);

      // Notify members
      const members = await groupFundRepository.getMembers(fundId, trx);
      for (const m of members) {
        await insertNotification(trx, {
          user_id: m.userId,
          type: 'fund_event',
          title: 'Hoàn thành mục tiêu quỹ',
          content: `Mục tiêu "${goal.name}" của quỹ "${fund.name}" đã được đánh dấu hoàn thành!`,
          data: { fundId, goalId, deductAmount }
        });
      }

      return {
        message: 'Hoàn thành mục tiêu thành công',
        deductAmount,
        newBalance
      };
    });
  },

  async inviteUsers(userId, fundId, { userIds }) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member) {
      throw createForbidden('Bạn không có quyền mời thành viên');
    }

    const fund = await groupFundRepository.getFundById(fundId);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const existingMembers = await groupFundRepository.getMembers(fundId);
    const memberIdSet = new Set(existingMembers.map((m) => m.userId));

    for (const inviteeId of userIds) {
      if (memberIdSet.has(inviteeId)) {
        continue; // Already a member
      }

      const pending = await groupFundRepository.getPendingInvitation(fundId, inviteeId);
      if (pending) {
        throw createConflict('Người dùng này đã được mời', 'INVITATION_ALREADY_SENT');
      }

      await db.transaction(async (trx) => {
        const invId = await groupFundRepository.createInvitation({
          group_fund_id: fundId,
          inviter_user_id: userId,
          invitee_user_id: inviteeId,
          status: 'pending',
          expires_at: expiresAt
        }, trx);

        // Notify invited user
        await insertNotification(trx, {
          user_id: inviteeId,
          type: 'fund_invitation',
          title: 'Lời mời tham gia quỹ',
          content: `Bạn được mời tham gia quỹ nhóm "${fund.name}"!`,
          data: { fundId, invitationId: invId }
        });
      });
    }

    return { message: 'Đã gửi lời mời thành công' };
  },

  async getOrCreateInviteLink(userId, fundId) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member) {
      throw createForbidden('Bạn không phải thành viên quỹ');
    }

    const fund = await groupFundRepository.getFundById(fundId);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    // Check existing active link invitation
    const existing = await db('group_fund_invitations')
      .where({ group_fund_id: fundId, inviter_user_id: userId, invitee_user_id: null, status: 'pending' })
      .where('expires_at', '>', new Date())
      .first();

    if (existing) {
      return { token: existing.invite_token, expiresAt: existing.expires_at };
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await groupFundRepository.createInvitation({
      group_fund_id: fundId,
      inviter_user_id: userId,
      invite_token: token,
      status: 'pending',
      expires_at: expiresAt
    });

    return { token, expiresAt };
  },

  async getPreviewJoin(token) {
    const invite = await groupFundRepository.getInvitationByToken(token);
    if (!invite || invite.status !== 'pending' || new Date(invite.expires_at) <= new Date()) {
      throw createBadRequest('Liên kết mời không còn hiệu lực');
    }

    const fund = await groupFundRepository.getFundById(invite.group_fund_id);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    const membersCount = await db('group_fund_members').where({ group_fund_id: fund.id }).count('user_id as count').first();

    return {
      fund: {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        icon: fund.icon,
        membersCount: Number(membersCount?.count || 0)
      }
    };
  },

  async joinByToken(userId, token) {
    const invite = await groupFundRepository.getInvitationByToken(token);
    if (!invite || invite.status !== 'pending' || new Date(invite.expires_at) <= new Date()) {
      throw createBadRequest('Liên kết mời không còn hiệu lực');
    }

    const fund = await groupFundRepository.getFundById(invite.group_fund_id);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    const existingMember = await groupFundRepository.getMember(fund.id, userId);
    if (existingMember) {
      return { message: 'Bạn đã là thành viên của quỹ này', fundId: fund.id };
    }

    await groupFundRepository.addMember(fund.id, userId, 'member');

    return { message: 'Tham gia quỹ thành công', fundId: fund.id };
  },

  async respondInvitation(userId, invitationId, action) {
    const invite = await groupFundRepository.getInvitationById(invitationId);
    if (!invite || invite.invitee_user_id !== userId || invite.status !== 'pending') {
      throw createBadRequest('Lời mời này không còn tồn tại');
    }

    const fund = await groupFundRepository.getFundById(invite.group_fund_id);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này không còn hoạt động');
    }

    if (action === 'accept') {
      await db.transaction(async (trx) => {
        await groupFundRepository.addMember(fund.id, userId, 'member', trx);
        await groupFundRepository.updateInvitation(invitationId, { status: 'accepted' }, trx);

        // Notify inviter
        await insertNotification(trx, {
          user_id: invite.inviter_user_id,
          type: 'fund_event',
          title: 'Lời mời được chấp nhận',
          content: `Lời mời tham gia quỹ "${fund.name}" của bạn đã được chấp nhận!`,
          data: { fundId: fund.id, userId }
        });
      });
      return { message: 'Chấp nhận lời mời thành công', fundId: fund.id };
    } else {
      await db.transaction(async (trx) => {
        await groupFundRepository.updateInvitation(invitationId, { status: 'declined' }, trx);
        await insertNotification(trx, {
          user_id: invite.inviter_user_id,
          type: 'fund_event',
          title: 'Lời mời bị từ chối',
          content: `Lời mời tham gia quỹ "${fund.name}" của bạn đã bị từ chối.`,
          data: { fundId: fund.id, userId }
        });
      });
      return { message: 'Đã từ chối lời mời' };
    }
  },

  async transferOwner(userId, fundId, newOwnerUserId) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member || member.role !== 'owner') {
      throw createForbidden('Chỉ Chủ quỹ mới có quyền chuyển quyền');
    }

    const targetMember = await groupFundRepository.getMember(fundId, newOwnerUserId);
    if (!targetMember) {
      throw createBadRequest('Người dùng được chọn không phải thành viên của quỹ');
    }

    return db.transaction(async (trx) => {
      await groupFundRepository.updateMemberRole(fundId, userId, 'member', trx);
      await groupFundRepository.updateMemberRole(fundId, newOwnerUserId, 'owner', trx);
      return { message: 'Chuyển quyền Chủ quỹ thành công' };
    });
  },

  async leaveFund(userId, fundId) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member) {
      throw createBadRequest('Bạn không phải thành viên của quỹ này');
    }

    const allMembers = await groupFundRepository.getMembers(fundId);
    if (member.role === 'owner') {
      if (allMembers.length > 1) {
        throw createBadRequest('Hãy chuyển quyền Chủ quỹ cho một thành viên khác trước khi rời quỹ');
      } else {
        throw createBadRequest('Bạn là thành viên duy nhất, vui lòng giải tán quỹ thay vì rời quỹ');
      }
    }

    await groupFundRepository.removeMember(fundId, userId);
    return { message: 'Rời quỹ nhóm thành công' };
  },

  async dissolveFund(userId, fundId) {
    const member = await groupFundRepository.getMember(fundId, userId);
    if (!member || member.role !== 'owner') {
      throw createForbidden('Chỉ Chủ quỹ mới có quyền giải tán quỹ');
    }

    const fund = await groupFundRepository.getFundById(fundId);
    if (!fund || fund.status === 'dissolved') {
      throw createBadRequest('Quỹ này đã được giải tán');
    }

    return db.transaction(async (trx) => {
      await groupFundRepository.updateFund(fundId, {
        status: 'dissolved',
        updated_at: trx.fn.now()
      }, trx);

      // Notify all members
      const members = await groupFundRepository.getMembers(fundId, trx);
      for (const m of members) {
        if (m.userId !== userId) {
          await insertNotification(trx, {
            user_id: m.userId,
            type: 'fund_event',
            title: 'Quỹ nhóm đã giải tán',
            content: `Quỹ "${fund.name}" đã được giải tán bởi Chủ quỹ.`,
            data: { fundId }
          });
        }
      }

      return { message: 'Giải tán quỹ nhóm thành công' };
    });
  }
};
