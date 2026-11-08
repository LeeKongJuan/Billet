import { afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/db.js';

const testEmails = [];

async function createAuthenticatedUser(displayName) {
  const email = `api-test-${Date.now()}-${Math.random().toString(16).slice(2)}@billet.test`;
  testEmails.push(email);

  const registration = await request(app)
    .post('/api/auth/register')
    .send({ displayName, email, password: 'TestPass123', confirmPassword: 'TestPass123' });
  expect(registration.status).toBe(201);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'TestPass123' });
  expect(login.status).toBe(200);

  return {
    user: registration.body.data.user,
    cookie: login.headers['set-cookie'][0].split(';')[0]
  };
}

afterAll(async () => {
  if (testEmails.length > 0) {
    const users = await db('users').select('id').whereIn('email', testEmails);
    const userIds = users.map((user) => user.id);
    if (userIds.length > 0) {
      await db('group_funds')
        .whereIn('id', db('group_fund_members').select('group_fund_id').whereIn('user_id', userIds))
        .del();
    }
    await db('users').whereIn('email', testEmails).del();
  }
});

describe('Server API Endpoints', () => {
  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.environment).toBeDefined();
  });

  it('GET /api/wallets without auth should return 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/wallets');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/unknown-route should return 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('creates wallets and bills for an authenticated user', async () => {
    const { cookie } = await createAuthenticatedUser('API Test User');

    const wallet = await request(app)
      .post('/api/wallets')
      .set('Cookie', cookie)
      .send({ name: 'API test wallet', initialBalance: 1500 });
    expect(wallet.status).toBe(201);
    expect(wallet.body.data.name).toBe('API test wallet');
    expect(wallet.body.data.balance).toBe(1500);

    const bill = await request(app)
      .post('/api/bills')
      .set('Cookie', cookie)
      .send({ name: 'API test bill', participants: [{ displayName: 'Guest' }] });
    expect(bill.status).toBe(201);
    expect(bill.body.data.id).toBeDefined();

    const billDetail = await request(app)
      .get(`/api/bills/${bill.body.data.id}`)
      .set('Cookie', cookie);
    const participantIds = billDetail.body.data.participants.map((participant) => participant.id);
    const activity = await request(app)
      .post(`/api/bills/${bill.body.data.id}/activities`)
      .set('Cookie', cookie)
      .send({
        name: 'Encrypted test meal',
        totalAmount: 1000,
        paidByParticipantId: participantIds[0],
        splitType: 'equal',
        participantIds
      });
    expect(activity.status).toBe(201);

    const encryptedActivity = await db('bill_activities').where({ id: activity.body.data.activityId }).first();
    const billWithActivity = await request(app)
      .get(`/api/bills/${bill.body.data.id}`)
      .set('Cookie', cookie);
    expect(encryptedActivity.name).toMatch(/^billet:v1:/);
    expect(encryptedActivity.total_amount).toMatch(/^billet:v1:/);
    expect(billWithActivity.body.data.activities[0].name).toBe('Encrypted test meal');
    expect(billWithActivity.body.data.activities[0].totalAmount).toBe(1000);

    const closeBill = await request(app)
      .post(`/api/bills/${bill.body.data.id}/close`)
      .set('Cookie', cookie);
    expect(closeBill.status).toBe(200);
    const storedSettlement = await db('bill_settlements').where({ bill_id: bill.body.data.id }).first();
    const closedBill = await request(app)
      .get(`/api/bills/${bill.body.data.id}`)
      .set('Cookie', cookie);
    expect(storedSettlement.amount).toMatch(/^billet:v1:/);
    expect(closedBill.body.data.settlements[0].amount).toBe(500);

    const bills = await request(app).get('/api/bills').set('Cookie', cookie);
    expect(bills.status).toBe(200);
    expect(bills.body.data.some((item) => item.id === bill.body.data.id)).toBe(true);
  });

  it('creates a transaction and updates the owned wallet balance', async () => {
    const { cookie } = await createAuthenticatedUser('API Transaction User');

    const wallets = await request(app).get('/api/wallets').set('Cookie', cookie);
    const wallet = await request(app)
      .post('/api/wallets')
      .set('Cookie', cookie)
      .send({ name: 'Transaction test wallet', initialBalance: 2000 });
    const categories = await request(app)
      .get('/api/categories?type=expense')
      .set('Cookie', cookie);

    expect(wallets.status).toBe(200);
    expect(wallet.status).toBe(201);
    expect(categories.status).toBe(200);

    const transaction = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookie)
      .send({
        name: 'Ăn sáng',
        walletId: wallet.body.data.id,
        categoryId: categories.body.data[0].id,
        type: 'expense',
        amount: 800,
        occurredOn: '2026-11-07',
        note: 'Transaction API regression test'
      });

    expect(transaction.status).toBe(201);
    expect(transaction.body.data.amount).toBe(800);
    expect(transaction.body.data.name).toBe('Ăn sáng');

    const updatedWallets = await request(app).get('/api/wallets').set('Cookie', cookie);
    const createdTransactions = await request(app)
      .get('/api/transactions')
      .set('Cookie', cookie);

    expect(updatedWallets.body.data.wallets.find((item) => item.id === wallet.body.data.id).balance).toBe(1200);
    expect(createdTransactions.body.data.some((item) => (
      item.name === 'Ăn sáng' && item.note === 'Transaction API regression test'
    ))).toBe(true);

    const storedTransaction = await db('transactions').where({ id: transaction.body.data.id }).first();
    const storedWallet = await db('wallets').where({ id: wallet.body.data.id }).first();
    expect(storedTransaction.amount).toMatch(/^billet:v1:/);
    expect(storedTransaction.name).toMatch(/^billet:v1:/);
    expect(storedTransaction.note).toMatch(/^billet:v1:/);
    expect(storedWallet.balance).toMatch(/^billet:v1:/);

    const searchedTransactions = await request(app)
      .get('/api/transactions?keyword=regression%20test')
      .set('Cookie', cookie);
    expect(searchedTransactions.status).toBe(200);
    expect(searchedTransactions.body.data[0].name).toBe('Ăn sáng');

    const overBalanceUpdate = await request(app)
      .put(`/api/transactions/${transaction.body.data.id}`)
      .set('Cookie', cookie)
      .send({
        name: 'Ăn sáng',
        walletId: wallet.body.data.id,
        categoryId: categories.body.data[0].id,
        type: 'expense',
        amount: 2001,
        occurredOn: '2026-11-07',
        note: 'Must not overdraw wallet'
      });
    expect(overBalanceUpdate.status).toBe(400);
    expect(overBalanceUpdate.body.error.code).toBe('WALLET_INSUFFICIENT_BALANCE');

    const overBalanceCreate = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookie)
      .send({
        name: 'Mua đồ dùng',
        walletId: wallet.body.data.id,
        categoryId: categories.body.data[0].id,
        type: 'expense',
        amount: 1201,
        occurredOn: '2026-11-07',
        note: 'Must not create a negative wallet balance'
      });
    expect(overBalanceCreate.status).toBe(400);
    expect(overBalanceCreate.body.error.code).toBe('WALLET_INSUFFICIENT_BALANCE');

    const budget = await request(app)
      .post('/api/budgets')
      .set('Cookie', cookie)
      .send({ month: '2026-11', amount: 1500 });
    expect(budget.status).toBe(201);

    const monthlyBudget = await request(app)
      .get('/api/budgets/current')
      .set('Cookie', cookie);
    expect(monthlyBudget.status).toBe(200);
    expect(monthlyBudget.body.data.transactions.some((item) => item.name === 'Ăn sáng')).toBe(true);

    const updateBudget = await request(app)
      .put(`/api/budgets/${budget.body.data.id}`)
      .set('Cookie', cookie)
      .send({ amount: 800 });
    expect(updateBudget.status).toBe(200);
    const storedBudget = await db('budgets').where({ id: budget.body.data.id }).first();
    expect(storedBudget.amount).toMatch(/^billet:v1:/);

    const notifications = await request(app)
      .get('/api/notifications')
      .set('Cookie', cookie);
    expect(notifications.status).toBe(200);
    expect(notifications.body.data.notifications[0].content).toContain('800');
    const storedNotification = await db('notifications').orderBy('id', 'desc').first();
    expect(storedNotification.content).toMatch(/^billet:v1:/);
    expect(storedNotification.data).toMatch(/^billet:v1:/);

    const overview = await request(app)
      .get('/api/reports/overview?period=this_month')
      .set('Cookie', cookie);
    const expenseCategories = await request(app)
      .get('/api/reports/expense-categories?period=this_month')
      .set('Cookie', cookie);
    const trend = await request(app)
      .get('/api/reports/trend?period=this_month')
      .set('Cookie', cookie);
    expect(overview.body.data.totalExpense).toBe(800);
    expect(expenseCategories.body.data.categories[0].amount).toBe(800);
    expect(trend.body.data.data.reduce((sum, item) => sum + item.expense, 0)).toBe(800);

    const overBudgetTransaction = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookie)
      .send({
        name: 'Ăn tối',
        walletId: wallet.body.data.id,
        categoryId: categories.body.data[0].id,
        type: 'expense',
        amount: 701,
        occurredOn: '2026-11-07',
        note: 'Must not exceed remaining budget'
      });
    expect(overBudgetTransaction.status).toBe(400);
    expect(overBudgetTransaction.body.error.code).toBe('BUDGET_EXCEEDED');

    const missingName = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookie)
      .send({
        walletId: wallet.body.data.id,
        categoryId: categories.body.data[0].id,
        type: 'expense',
        amount: 1,
        occurredOn: '2026-11-07'
      });
    expect(missingName.status).toBe(400);
    expect(missingName.body.error.fields.name).toBe('Vui lòng nhập tên giao dịch');

    const tooManyNoteWords = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookie)
      .send({
        name: 'Giao dịch có ghi chú quá dài',
        walletId: wallet.body.data.id,
        categoryId: categories.body.data[0].id,
        type: 'expense',
        amount: 1,
        occurredOn: '2026-11-07',
        note: 'từ '.repeat(101).trim()
      });
    expect(tooManyNoteWords.status).toBe(400);
    expect(tooManyNoteWords.body.error.fields.note).toBe('Ghi chú không được vượt quá 100 từ');

    const unchangedWallets = await request(app).get('/api/wallets').set('Cookie', cookie);
    expect(unchangedWallets.body.data.wallets.find((item) => item.id === wallet.body.data.id).balance).toBe(1200);

    const destinationWallet = await request(app)
      .post('/api/wallets')
      .set('Cookie', cookie)
      .send({ name: 'Encrypted transfer destination', initialBalance: 500 });
    const transfer = await request(app)
      .post('/api/wallet-transfers')
      .set('Cookie', cookie)
      .send({
        fromWalletId: wallet.body.data.id,
        toWalletId: destinationWallet.body.data.id,
        amount: 100,
        note: 'Encrypted transfer note',
        transferredOn: '2026-11-07'
      });
    expect(transfer.status).toBe(200);
    const storedTransfer = await db('wallet_transfers').orderBy('id', 'desc').first();
    expect(storedTransfer.amount).toMatch(/^billet:v1:/);
    expect(storedTransfer.note).toMatch(/^billet:v1:/);

    const goal = await request(app)
      .post('/api/savings-goals')
      .set('Cookie', cookie)
      .send({ name: 'Encrypted savings goal', targetAmount: 500, targetDate: '2026-12-31' });
    expect(goal.status).toBe(201);
    const deposit = await request(app)
      .post(`/api/savings-goals/${goal.body.data.id}/deposit`)
      .set('Cookie', cookie)
      .send({ walletId: wallet.body.data.id, amount: 100, note: 'Encrypted savings movement' });
    expect(deposit.status).toBe(200);
    const storedGoal = await db('savings_goals').where({ id: goal.body.data.id }).first();
    const storedMovement = await db('savings_goal_movements').orderBy('id', 'desc').first();
    expect(storedGoal.target_amount).toMatch(/^billet:v1:/);
    expect(storedGoal.current_amount).toMatch(/^billet:v1:/);
    expect(storedMovement.amount).toMatch(/^billet:v1:/);
    expect(storedMovement.note).toMatch(/^billet:v1:/);
  });

  it('deducts group contributions from the selected wallet and requires surplus for goal completion', async () => {
    const { cookie } = await createAuthenticatedUser('API Fund Contribution User');
    const wallet = await request(app)
      .post('/api/wallets')
      .set('Cookie', cookie)
      .send({ name: 'Fund contribution wallet', initialBalance: 5000 });
    const fund = await request(app)
      .post('/api/group-funds')
      .set('Cookie', cookie)
      .send({ name: 'Contribution API test fund' });

    expect(wallet.status).toBe(201);
    expect(fund.status).toBe(201);

    const contribution = await request(app)
      .post(`/api/group-funds/${fund.body.data.id}/contribute`)
      .set('Cookie', cookie)
      .send({ walletId: wallet.body.data.id, amount: 3000, note: 'Test contribution' });
    expect(contribution.status).toBe(200);

    const storedFund = await db('group_funds').where({ id: fund.body.data.id }).first();
    const storedFundTransaction = await db('group_fund_transactions')
      .where({ group_fund_id: fund.body.data.id, type: 'contribution' })
      .first();
    expect(storedFund.balance).toMatch(/^billet:v1:/);
    expect(storedFundTransaction.amount).toMatch(/^billet:v1:/);
    expect(storedFundTransaction.note).toMatch(/^billet:v1:/);

    const balanceWallets = await request(app).get('/api/wallets').set('Cookie', cookie);
    expect(balanceWallets.body.data.wallets.find((item) => item.id === wallet.body.data.id).balance).toBe(2000);

    const insufficientContribution = await request(app)
      .post(`/api/group-funds/${fund.body.data.id}/contribute`)
      .set('Cookie', cookie)
      .send({ walletId: wallet.body.data.id, amount: 2500 });
    expect(insufficientContribution.status).toBe(400);
    expect(insufficientContribution.body.error.code).toBe('WALLET_INSUFFICIENT_BALANCE');

    const equalBalanceGoal = await request(app)
      .post(`/api/group-funds/${fund.body.data.id}/goals`)
      .set('Cookie', cookie)
      .send({ name: 'Equal to fund balance', targetAmount: 3000 });
    const blockedCompletion = await request(app)
      .post(`/api/group-funds/${fund.body.data.id}/goals/${equalBalanceGoal.body.data.id}/complete`)
      .set('Cookie', cookie);
    expect(blockedCompletion.status).toBe(400);
    expect(blockedCompletion.body.error.code).toBe('FUND_BALANCE_NOT_ENOUGH');

    const completableGoal = await request(app)
      .post(`/api/group-funds/${fund.body.data.id}/goals`)
      .set('Cookie', cookie)
      .send({ name: 'Less than fund balance', targetAmount: 2000 });
    const completion = await request(app)
      .post(`/api/group-funds/${fund.body.data.id}/goals/${completableGoal.body.data.id}/complete`)
      .set('Cookie', cookie);
    expect(completion.status).toBe(200);
    expect(completion.body.data.newBalance).toBe(1000);
  }, 10000);

  it('serves user search and blocks non-participants from changing bills', async () => {
    const owner = await createAuthenticatedUser('API Bill Owner');
    const other = await createAuthenticatedUser('API Other User');

    const search = await request(app)
      .get('/api/users/search?q=API%20Other')
      .set('Cookie', owner.cookie);
    expect(search.status).toBe(200);
    expect(search.body.data.some((user) => user.id === other.user.id)).toBe(true);

    const bill = await request(app)
      .post('/api/bills')
      .set('Cookie', owner.cookie)
      .send({ name: 'Private API test bill', participants: [{ displayName: 'Guest' }] });
    expect(bill.status).toBe(201);

    const detail = await request(app)
      .get(`/api/bills/${bill.body.data.id}`)
      .set('Cookie', other.cookie);
    expect(detail.status).toBe(403);

    const close = await request(app)
      .post(`/api/bills/${bill.body.data.id}/close`)
      .set('Cookie', other.cookie);
    expect(close.status).toBe(403);
  });
});
