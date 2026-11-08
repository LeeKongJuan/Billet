import bcrypt from 'bcryptjs';
import { encryptMoney, encryptSensitive } from '../src/shared/encryption.js';

/**
 * Seed initial categories and demo data matching PDF report mockups.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Check if users already seeded
  const existingUser = await knex('users').where({ email: 'tuanviet@billet.vn' }).first();
  if (existingUser) {
    return; // Already seeded
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash('Billet123@', saltRounds);

  // 1. Create demo users (matching authors in PDF)
  const [userId1] = await knex('users').insert({
    display_name: 'Nguyễn Đức Tuấn Việt',
    email: 'tuanviet@billet.vn',
    password_hash: passwordHash
  });

  const [userId2] = await knex('users').insert({
    display_name: 'Lê Công Tuấn',
    email: 'congtuan@billet.vn',
    password_hash: passwordHash
  });

  const [userId3] = await knex('users').insert({
    display_name: 'Nguyễn Quốc Việt',
    email: 'quocviet@billet.vn',
    password_hash: passwordHash
  });

  const [userId4] = await knex('users').insert({
    display_name: 'Nguyễn Phước Hoàng Tú',
    email: 'hoangtu@billet.vn',
    password_hash: passwordHash
  });

  // 2. Default categories for demo user
  const defaultCategories = [
    { name: 'Ăn uống', type: 'expense', icon: 'utensils' },
    { name: 'Di chuyển', type: 'expense', icon: 'car' },
    { name: 'Mua sắm', type: 'expense', icon: 'shopping-bag' },
    { name: 'Nhà cửa', type: 'expense', icon: 'home' },
    { name: 'Giải trí', type: 'expense', icon: 'film' },
    { name: 'Khác', type: 'expense', icon: 'tag' },
    { name: 'Lương', type: 'income', icon: 'briefcase' },
    { name: 'Thưởng', type: 'income', icon: 'gift' },
    { name: 'Thu nhập khác', type: 'income', icon: 'plus-circle' }
  ];

  const catMap = {};
  for (const cat of defaultCategories) {
    const [catId] = await knex('categories').insert({
      user_id: userId1,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      status: 'active'
    });
    catMap[cat.name] = catId;
  }

  // 3. Wallets matching Mockup Figure 4.4 & 4.5: Total 12.400.000 VND
  const [wallet1] = await knex('wallets').insert({
    user_id: userId1,
    name: 'Tài khoản ngân hàng',
    description: 'Thẻ Vietcombank chi tiêu chính',
    balance: encryptMoney(10000000),
    status: 'active'
  });

  const [wallet2] = await knex('wallets').insert({
    user_id: userId1,
    name: 'Tiền mặt',
    description: 'Tiền mặt chi tiêu hằng ngày',
    balance: encryptMoney(2400000),
    status: 'active'
  });

  // 4. Budget matching Mockup Figure 4.4 & 4.12: limit 5.000.000 or 8.000.000 VND
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  await knex('budgets').insert({
    user_id: userId1,
    month: currentMonth,
    amount: encryptMoney(5000000)
  });

  // 5. Sample transactions for Figure 4.4 & 4.9:
  const today = new Date().toISOString().slice(0, 10);
  await knex('transactions').insert([
    {
      user_id: userId1,
      name: encryptSensitive('Cơm trưa văn phòng'),
      wallet_id: wallet1,
      category_id: catMap['Ăn uống'],
      type: 'expense',
      amount: encryptMoney(65000),
      occurred_on: today,
      note: encryptSensitive('Cơm trưa văn phòng')
    },
    {
      user_id: userId1,
      name: encryptSensitive('Cà phê sáng'),
      wallet_id: wallet2,
      category_id: catMap['Ăn uống'],
      type: 'expense',
      amount: encryptMoney(35000),
      occurred_on: today,
      note: encryptSensitive('Cà phê sáng')
    },
    {
      user_id: userId1,
      name: encryptSensitive('Lương tạm ứng tháng'),
      wallet_id: wallet1,
      category_id: catMap['Lương'],
      type: 'income',
      amount: encryptMoney(8000000),
      occurred_on: today,
      note: encryptSensitive('Lương tạm ứng tháng')
    }
  ]);

  // 6. Savings Goals matching Figure 4.15: 4.000.000 VND
  await knex('savings_goals').insert({
    user_id: userId1,
    name: 'Chuyến đi Đà Lạt',
    target_amount: encryptMoney(5000000),
    current_amount: encryptMoney(4000000),
    target_date: '2026-12-31',
    status: 'accumulating'
  });

  // 7. Group Fund matching Figure 4.17 & 4.18: "Đà Lạt cuối tuần"
  const [fundId] = await knex('group_funds').insert({
    name: 'Đà Lạt cuối tuần',
    description: 'Quỹ chung cho chuyến đi dã ngoại cuối tuần tại Đà Lạt',
    icon: 'users',
    balance: encryptMoney(3600000),
    status: 'active'
  });

  await knex('group_fund_members').insert([
    { group_fund_id: fundId, user_id: userId1, role: 'owner' },
    { group_fund_id: fundId, user_id: userId2, role: 'member' },
    { group_fund_id: fundId, user_id: userId3, role: 'member' },
    { group_fund_id: fundId, user_id: userId4, role: 'member' }
  ]);

  const [fundGoalId] = await knex('group_fund_goals').insert({
    group_fund_id: fundId,
    name: 'Chi phí thuê villa',
    target_amount: encryptMoney(4000000),
    target_date: '2026-12-20',
    status: 'accumulating'
  });

  await knex('group_fund_transactions').insert([
    {
      group_fund_id: fundId,
      user_id: userId1,
      type: 'contribution',
      amount: encryptMoney(1000000),
      occurred_on: today,
      note: encryptSensitive('Tuấn Việt đóng góp đợt 1')
    },
    {
      group_fund_id: fundId,
      user_id: userId2,
      type: 'contribution',
      amount: encryptMoney(1000000),
      occurred_on: today,
      note: encryptSensitive('Công Tuấn đóng góp đợt 1')
    },
    {
      group_fund_id: fundId,
      user_id: userId3,
      type: 'contribution',
      amount: encryptMoney(800000),
      occurred_on: today,
      note: encryptSensitive('Quốc Việt đóng góp đợt 1')
    },
    {
      group_fund_id: fundId,
      user_id: userId4,
      type: 'contribution',
      amount: encryptMoney(800000),
      occurred_on: today,
      note: encryptSensitive('Hoàng Tú đóng góp đợt 1')
    }
  ]);

  // 8. Bill Split matching Figure 4.23: "Đà Lạt cuối tuần"
  const [billId] = await knex('bills').insert({
    creator_user_id: userId1,
    name: 'Đà Lạt cuối tuần',
    status: 'open'
  });

  const [part1] = await knex('bill_participants').insert({
    bill_id: billId,
    user_id: userId1,
    display_name: 'Nguyễn Đức Tuấn Việt'
  });

  const [part2] = await knex('bill_participants').insert({
    bill_id: billId,
    user_id: userId2,
    display_name: 'Lê Công Tuấn'
  });

  const [part3] = await knex('bill_participants').insert({
    bill_id: billId,
    user_id: userId3,
    display_name: 'Nguyễn Quốc Việt'
  });

  const [part4] = await knex('bill_participants').insert({
    bill_id: billId,
    user_id: null,
    display_name: 'Khách (Linh)'
  });

  // Sample activity: 600.000 paid by Tuấn, split 3 equal (200.000 each)
  const [act1] = await knex('bill_activities').insert({
    bill_id: billId,
    name: encryptSensitive('Ăn tối BBQ'),
    total_amount: encryptMoney(600000),
    paid_by_participant_id: part2,
    split_type: 'equal'
  });

  await knex('bill_activity_shares').insert([
    { bill_activity_id: act1, participant_id: part1, amount: encryptMoney(200000) },
    { bill_activity_id: act1, participant_id: part2, amount: encryptMoney(200000) },
    { bill_activity_id: act1, participant_id: part3, amount: encryptMoney(200000) }
  ]);
}
