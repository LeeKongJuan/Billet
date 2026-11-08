import { db } from '../../config/db.js';
import { decryptMoney, decryptRows, decryptSensitive, encryptMoney, encryptSensitive } from '../../shared/encryption.js';

const encryptFields = (data, moneyFields = [], textFields = []) => Object.fromEntries(
  Object.entries(data).map(([field, value]) => {
    if (value === null || value === undefined) return [field, value];
    if (moneyFields.includes(field)) return [field, encryptMoney(value)];
    if (textFields.includes(field)) return [field, encryptSensitive(value)];
    return [field, value];
  })
);

const decryptMoneyRow = (row, fields) => {
  if (!row) return row;
  return Object.fromEntries(Object.entries(row).map(([field, value]) => [
    field,
    fields.includes(field) && value !== null && value !== undefined ? decryptMoney(value) : value
  ]));
};

export const groupFundRepository = {
  async getFundsByUserId(userId) {
    const funds = await db('group_funds')
      .join('group_fund_members', 'group_funds.id', 'group_fund_members.group_fund_id')
      .where('group_fund_members.user_id', userId)
      .where('group_funds.status', 'active')
      .select(
        'group_funds.id',
        'group_funds.name',
        'group_funds.description',
        'group_funds.icon',
        'group_funds.balance',
        'group_funds.status',
        'group_fund_members.role',
        'group_funds.created_at as createdAt'
      )
      .orderBy('group_funds.id', 'desc');
    return decryptRows(funds, ['balance']);
  },

  async getFundById(fundId, trx = db) {
    const fund = await trx('group_funds')
      .where({ id: fundId })
      .first();
    return decryptMoneyRow(fund, ['balance']);
  },

  async getFundForUpdate(fundId, trx) {
    const fund = await trx('group_funds')
      .where({ id: fundId })
      .forUpdate()
      .first();
    return decryptMoneyRow(fund, ['balance']);
  },

  async getMember(fundId, userId, trx = db) {
    return trx('group_fund_members')
      .where({ group_fund_id: fundId, user_id: userId })
      .first();
  },

  async getMembers(fundId, trx = db) {
    return trx('group_fund_members')
      .join('users', 'group_fund_members.user_id', 'users.id')
      .where({ group_fund_id: fundId })
      .select(
        'users.id as userId',
        'users.display_name as displayName',
        'users.email',
        'group_fund_members.role',
        'group_fund_members.joined_at as joinedAt'
      )
      .orderBy('group_fund_members.role', 'asc') // owner first
      .orderBy('users.display_name', 'asc');
  },

  async createFund(data, trx = db) {
    const [id] = await trx('group_funds').insert(encryptFields(data, ['balance']));
    return id;
  },

  async addMember(fundId, userId, role = 'member', trx = db) {
    await trx('group_fund_members').insert({
      group_fund_id: fundId,
      user_id: userId,
      role
    });
  },

  async removeMember(fundId, userId, trx = db) {
    await trx('group_fund_members')
      .where({ group_fund_id: fundId, user_id: userId })
      .del();
  },

  async updateMemberRole(fundId, userId, role, trx = db) {
    await trx('group_fund_members')
      .where({ group_fund_id: fundId, user_id: userId })
      .update({ role });
  },

  async updateFund(fundId, data, trx = db) {
    await trx('group_funds').where({ id: fundId }).update(encryptFields(data, ['balance']));
  },

  // Invitations
  async getPendingInvitation(fundId, inviteeUserId) {
    return db('group_fund_invitations')
      .where({
        group_fund_id: fundId,
        invitee_user_id: inviteeUserId,
        status: 'pending'
      })
      .where('expires_at', '>', new Date())
      .first();
  },

  async createInvitation(data, trx = db) {
    const [id] = await trx('group_fund_invitations').insert(data);
    return id;
  },

  async getInvitationByToken(token) {
    return db('group_fund_invitations')
      .where({ invite_token: token })
      .first();
  },

  async getInvitationById(id, trx = db) {
    return trx('group_fund_invitations')
      .where({ id })
      .first();
  },

  async updateInvitation(id, data, trx = db) {
    await trx('group_fund_invitations').where({ id }).update(data);
  },

  // Transactions
  async createTransaction(data, trx = db) {
    const [id] = await trx('group_fund_transactions').insert(
      encryptFields(data, ['amount'], ['note'])
    );
    return id;
  },

  async getTransactions(fundId) {
    const transactions = await db('group_fund_transactions')
      .join('users', 'group_fund_transactions.user_id', 'users.id')
      .leftJoin('wallets', 'group_fund_transactions.wallet_id', 'wallets.id')
      .where({ group_fund_id: fundId })
      .select(
        'group_fund_transactions.id',
        'group_fund_transactions.group_fund_id as fundId',
        'group_fund_transactions.user_id as userId',
        'users.display_name as userDisplayName',
        'group_fund_transactions.wallet_id as walletId',
        'wallets.name as walletName',
        'group_fund_transactions.type',
        'group_fund_transactions.amount',
        'group_fund_transactions.note',
        'group_fund_transactions.occurred_on as occurredOn',
        'group_fund_transactions.created_at as createdAt'
      )
      .orderBy('group_fund_transactions.occurred_on', 'desc')
      .orderBy('group_fund_transactions.id', 'desc');
    return transactions.map((transaction) => ({
      ...transaction,
      amount: decryptMoney(transaction.amount),
      note: decryptSensitive(transaction.note)
    }));
  },

  // Goals
  async getGoals(fundId) {
    const goals = await db('group_fund_goals')
      .where({ group_fund_id: fundId })
      .select(
        'id',
        'group_fund_id as fundId',
        'name',
        'target_amount as targetAmount',
        'target_date as targetDate',
        'status',
        'created_at as createdAt'
      )
      .orderBy('id', 'desc');
    return decryptRows(goals, ['targetAmount']);
  },

  async getGoalById(fundId, goalId, trx = db) {
    const goal = await trx('group_fund_goals')
      .where({ id: goalId, group_fund_id: fundId })
      .first();
    return decryptMoneyRow(goal, ['target_amount']);
  },

  async createGoal(data, trx = db) {
    const [id] = await trx('group_fund_goals').insert(encryptFields(data, ['target_amount']));
    return id;
  },

  async updateGoal(goalId, fundId, data, trx = db) {
    await trx('group_fund_goals')
      .where({ id: goalId, group_fund_id: fundId })
      .update(encryptFields(data, ['target_amount']));
  },

  async deleteGoal(goalId, fundId, trx = db) {
    await trx('group_fund_goals')
      .where({ id: goalId, group_fund_id: fundId })
      .del();
  }
};
