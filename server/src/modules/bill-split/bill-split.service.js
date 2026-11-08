import { billSplitRepository } from './bill-split.repository.js';
import { calculateEqualShares, validateCustomShares } from './algorithms/split.js';
import { calculateNetBalances, simplifyDebts } from './algorithms/simplify-debts.js';
import { db } from '../../config/db.js';
import {
  createBadRequest,
  createNotFound,
  createForbidden
} from '../../shared/errors.js';

export const billSplitService = {
  async getBills(userId) {
    return billSplitRepository.getBillsByUserId(userId);
  },

  async assertBillAccess(userId, billId) {
    const bill = await billSplitRepository.getBillById(billId);
    if (!bill) {
      throw createNotFound('Không tìm thấy hóa đơn');
    }

    const participants = await billSplitRepository.getParticipants(billId);
    const isParticipantOrCreator = bill.creator_user_id === userId ||
      participants.some((participant) => participant.userId === userId);

    if (!isParticipantOrCreator) {
      throw createForbidden('Bạn không có quyền truy cập hóa đơn này');
    }

    return bill;
  },

  async createBill(userId, userDisplayName, { name, participants }) {
    return db.transaction(async (trx) => {
      const billId = await billSplitRepository.createBill({
        creator_user_id: userId,
        name: name.trim(),
        status: 'open'
      }, trx);

      // Current user is always a participant
      const userAlreadyInList = participants.some((p) => p.userId === userId);
      const participantList = userAlreadyInList
        ? [...participants]
        : [{ displayName: userDisplayName, userId }, ...participants];

      for (const p of participantList) {
        await billSplitRepository.addParticipant({
          bill_id: billId,
          user_id: p.userId || null,
          display_name: p.displayName.trim()
        }, trx);
      }

      return billSplitRepository.getBillById(billId, trx);
    });
  },

  async getBillDetail(userId, billId) {
    const bill = await billSplitRepository.getBillById(billId);
    if (!bill) {
      throw createNotFound('Không tìm thấy hóa đơn');
    }

    const participants = await billSplitRepository.getParticipants(billId);
    const isParticipantOrCreator =
      bill.creator_user_id === userId ||
      participants.some((p) => p.userId === userId);

    if (!isParticipantOrCreator) {
      throw createForbidden('Bạn không có quyền truy cập hóa đơn này');
    }

    const activities = await billSplitRepository.getActivities(billId);

    let settlements = [];
    const participantMap = new Map(participants.map((p) => [p.id, p.displayName]));

    if (bill.status === 'open') {
      // Calculate dynamic settlements
      const allIds = participants.map((p) => p.id);
      const netBalances = calculateNetBalances(activities, allIds);
      const calculated = simplifyDebts(netBalances);

      settlements = calculated.map((s) => ({
        fromParticipantId: s.fromParticipantId,
        fromDisplayName: participantMap.get(s.fromParticipantId) || `ID ${s.fromParticipantId}`,
        toParticipantId: s.toParticipantId,
        toDisplayName: participantMap.get(s.toParticipantId) || `ID ${s.toParticipantId}`,
        amount: s.amount,
        isPaid: false
      }));
    } else {
      // Bill is closed, load stored settlements
      settlements = await billSplitRepository.getSettlements(billId);
    }

    const totalBillAmount = activities.reduce((sum, a) => sum + Number(a.totalAmount), 0);

    return {
      bill: {
        id: bill.id,
        name: bill.name,
        status: bill.status,
        creatorUserId: bill.creator_user_id,
        createdAt: bill.created_at,
        totalAmount: totalBillAmount
      },
      participants,
      activities,
      settlements
    };
  },

  async addActivity(userId, billId, { name, totalAmount, paidByParticipantId, splitType, participantIds, customShares }) {
    const bill = await this.assertBillAccess(userId, billId);

    if (bill.status === 'closed') {
      throw createBadRequest('Hóa đơn đã kết thúc, không thể chỉnh sửa hoặc thêm hoạt động');
    }

    const participants = await billSplitRepository.getParticipants(billId);
    const participantIdSet = new Set(participants.map((p) => p.id));

    if (!participantIdSet.has(paidByParticipantId)) {
      throw createBadRequest('Người ứng trước không hợp lệ');
    }

    for (const pid of participantIds) {
      if (!participantIdSet.has(pid)) {
        throw createBadRequest(`Người tham gia ${pid} không hợp lệ`);
      }
    }

    let calculatedShares = {};
    if (splitType === 'equal') {
      calculatedShares = calculateEqualShares(totalAmount, participantIds);
    } else {
      if (!customShares) {
        throw createBadRequest('Vui lòng nhập số tiền cho từng người tham gia');
      }
      validateCustomShares(totalAmount, customShares);
      calculatedShares = customShares;
    }

    return db.transaction(async (trx) => {
      const actId = await billSplitRepository.createActivity({
        bill_id: billId,
        name: name.trim(),
        total_amount: totalAmount,
        paid_by_participant_id: paidByParticipantId,
        split_type: splitType
      }, trx);

      const sharesToInsert = Object.entries(calculatedShares).map(([pId, amt]) => ({
        bill_activity_id: actId,
        participant_id: Number(pId),
        amount: Number(amt)
      }));

      await billSplitRepository.createActivityShares(sharesToInsert, trx);

      return { message: 'Thêm hoạt động thành công', activityId: actId };
    });
  },

  async closeBill(userId, billId) {
    const bill = await this.assertBillAccess(userId, billId);

    if (bill.status === 'closed') {
      throw createBadRequest('Hóa đơn đã được kết thúc trước đó');
    }

    const participants = await billSplitRepository.getParticipants(billId);
    const activities = await billSplitRepository.getActivities(billId);

    const allIds = participants.map((p) => p.id);
    const netBalances = calculateNetBalances(activities, allIds);
    const calculatedSettlements = simplifyDebts(netBalances);

    return db.transaction(async (trx) => {
      await billSplitRepository.updateBill(billId, {
        status: 'closed',
        updated_at: trx.fn.now()
      }, trx);

      if (calculatedSettlements.length > 0) {
        const rows = calculatedSettlements.map((s) => ({
          bill_id: billId,
          debtor_participant_id: s.fromParticipantId,
          creditor_participant_id: s.toParticipantId,
          amount: s.amount,
          is_paid: false
        }));
        await billSplitRepository.createSettlements(rows, trx);
      }

      return {
        message: 'Kết thúc hóa đơn thành công'
      };
    });
  },

  async updateSettlementPaid(userId, billId, settlementId, isPaid) {
    const bill = await this.assertBillAccess(userId, billId);

    if (bill.status !== 'closed') {
      throw createBadRequest('Chỉ có thể đánh dấu đã trả khi hóa đơn đã kết thúc');
    }

    const updated = await billSplitRepository.updateSettlement(billId, settlementId, {
      is_paid: isPaid,
      paid_at: isPaid ? db.fn.now() : null,
      updated_at: db.fn.now()
    });
    if (!updated) {
      throw createNotFound('Không tìm thấy khoản thanh toán');
    }

    return { message: isPaid ? 'Đã đánh dấu hoàn thành khoản nợ' : 'Đã bỏ đánh dấu khoản nợ' };
  }
};
