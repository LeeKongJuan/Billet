import { db } from '../../config/db.js';
import { decryptMoney, decryptSensitive, encryptMoney, encryptSensitive } from '../../shared/encryption.js';

export const billSplitRepository = {
  async getBillsByUserId(userId) {
    // Return bills created by user OR where user is a participant
    return db('bills')
      .distinct('bills.id', 'bills.creator_user_id as creatorUserId', 'bills.name', 'bills.status', 'bills.created_at as createdAt')
      .leftJoin('bill_participants', 'bills.id', 'bill_participants.bill_id')
      .where('bills.creator_user_id', userId)
      .orWhere('bill_participants.user_id', userId)
      .orderBy('bills.id', 'desc');
  },

  async getBillById(billId, trx = db) {
    return trx('bills')
      .where({ id: billId })
      .first();
  },

  async createBill(data, trx = db) {
    const [id] = await trx('bills').insert(data);
    return id;
  },

  async updateBill(billId, data, trx = db) {
    await trx('bills').where({ id: billId }).update(data);
  },

  // Participants
  async getParticipants(billId, trx = db) {
    return trx('bill_participants')
      .where({ bill_id: billId })
      .select('id', 'bill_id as billId', 'user_id as userId', 'display_name as displayName')
      .orderBy('id', 'asc');
  },

  async addParticipant(data, trx = db) {
    const [id] = await trx('bill_participants').insert(data);
    return id;
  },

  // Activities & Shares
  async getActivities(billId, trx = db) {
    const activities = await trx('bill_activities')
      .join('bill_participants', 'bill_activities.paid_by_participant_id', 'bill_participants.id')
      .where('bill_activities.bill_id', billId)
      .select(
        'bill_activities.id',
        'bill_activities.bill_id as billId',
        'bill_activities.name',
        'bill_activities.total_amount as totalAmount',
        'bill_activities.paid_by_participant_id as paidByParticipantId',
        'bill_participants.display_name as paidByDisplayName',
        'bill_activities.split_type as splitType',
        'bill_activities.created_at as createdAt'
      )
      .orderBy('bill_activities.id', 'asc');

    for (const act of activities) {
      act.totalAmount = decryptMoney(act.totalAmount);
      act.name = decryptSensitive(act.name);
      act.shares = await trx('bill_activity_shares')
        .join('bill_participants', 'bill_activity_shares.participant_id', 'bill_participants.id')
        .where('bill_activity_shares.bill_activity_id', act.id)
        .select(
          'bill_activity_shares.participant_id as participantId',
          'bill_participants.display_name as displayName',
          'bill_activity_shares.amount'
        );
      act.shares = act.shares.map((share) => ({
        ...share,
        amount: decryptMoney(share.amount)
      }));
    }

    return activities;
  },

  async createActivity(data, trx = db) {
    const encrypted = {
      ...data,
      total_amount: encryptMoney(data.total_amount),
      name: encryptSensitive(data.name)
    };
    const [id] = await trx('bill_activities').insert(encrypted);
    return id;
  },

  async createActivityShares(shares, trx = db) {
    await trx('bill_activity_shares').insert(shares.map((share) => ({
      ...share,
      amount: encryptMoney(share.amount)
    })));
  },

  // Settlements
  async getSettlements(billId, trx = db) {
    const settlements = await trx('bill_settlements')
      .join('bill_participants as debtor', 'bill_settlements.debtor_participant_id', 'debtor.id')
      .join('bill_participants as creditor', 'bill_settlements.creditor_participant_id', 'creditor.id')
      .where('bill_settlements.bill_id', billId)
      .select(
        'bill_settlements.id',
        'bill_settlements.bill_id as billId',
        'bill_settlements.debtor_participant_id as fromParticipantId',
        'debtor.display_name as fromDisplayName',
        'bill_settlements.creditor_participant_id as toParticipantId',
        'creditor.display_name as toDisplayName',
        'bill_settlements.amount',
        'bill_settlements.is_paid as isPaid',
        'bill_settlements.paid_at as paidAt'
      )
      .orderBy('bill_settlements.id', 'asc');
    return settlements.map((settlement) => ({
      ...settlement,
      amount: decryptMoney(settlement.amount)
    }));
  },

  async createSettlements(settlements, trx = db) {
    await trx('bill_settlements').insert(settlements.map((settlement) => ({
      ...settlement,
      amount: encryptMoney(settlement.amount)
    })));
  },

  async updateSettlement(billId, settlementId, data, trx = db) {
    return trx('bill_settlements').where({ id: settlementId, bill_id: billId }).update(data);
  }
};
