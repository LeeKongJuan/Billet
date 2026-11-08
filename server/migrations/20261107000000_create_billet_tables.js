import { readFile } from 'fs/promises';

/**
 * Knex migration to create all 20 tables for Billet.
 * Compatible with MySQL 8+ (production on Railway) and SQLite (testing).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  if (knex.client.config.client === 'mysql2') {
    const schema = await readFile(new URL('./sql/schema.mysql.sql', import.meta.url), 'utf8');
    for (const statement of schema.split(';').map((sql) => sql.trim()).filter(Boolean)) {
      await knex.raw(statement);
    }
    return;
  }

  // 1. users
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('display_name', 100).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. sessions
  await knex.schema.createTable('sessions', (table) => {
    table.string('id', 64).primary(); // SHA-256 hash of token
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['expires_at']);
  });

  // 3. wallets
  await knex.schema.createTable('wallets', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.bigInteger('balance').notNullable().defaultTo(0);
    table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'status']);
  });

  // 4. wallet_transfers
  await knex.schema.createTable('wallet_transfers', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('from_wallet_id').unsigned().notNullable().references('id').inTable('wallets');
    table.integer('to_wallet_id').unsigned().notNullable().references('id').inTable('wallets');
    table.bigInteger('amount').notNullable();
    table.string('note', 255).nullable();
    table.date('transferred_on').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
  });

  // 5. categories
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.enum('type', ['expense', 'income']).notNullable();
    table.string('icon', 50).notNullable().defaultTo('tag');
    table.enum('status', ['active', 'archived']).notNullable().defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'type', 'status']);
  });

  // 6. transactions
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('wallet_id').unsigned().notNullable().references('id').inTable('wallets');
    table.integer('category_id').unsigned().notNullable().references('id').inTable('categories');
    table.enum('type', ['expense', 'income']).notNullable();
    table.bigInteger('amount').notNullable();
    table.date('occurred_on').notNullable();
    table.string('note', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'occurred_on']);
    table.index(['wallet_id']);
    table.index(['category_id']);
  });

  // 7. budgets
  await knex.schema.createTable('budgets', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('month', 7).notNullable(); // 'YYYY-MM'
    table.bigInteger('amount').notNullable();
    table.timestamp('alert_sent_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'month']);
  });

  // 8. savings_goals
  await knex.schema.createTable('savings_goals', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.bigInteger('target_amount').notNullable();
    table.bigInteger('current_amount').notNullable().defaultTo(0);
    table.date('target_date').notNullable();
    table.enum('status', ['accumulating', 'completed']).notNullable().defaultTo('accumulating');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['user_id']);
  });

  // 9. savings_goal_movements
  await knex.schema.createTable('savings_goal_movements', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('source_type', ['wallet', 'savings_goal']).notNullable();
    table.integer('source_id').unsigned().notNullable();
    table.enum('dest_type', ['wallet', 'savings_goal']).notNullable();
    table.integer('dest_id').unsigned().notNullable();
    table.bigInteger('amount').notNullable();
    table.string('note', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 10. group_funds
  await knex.schema.createTable('group_funds', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.string('icon', 50).defaultTo('users');
    table.bigInteger('balance').notNullable().defaultTo(0);
    table.enum('status', ['active', 'dissolved']).notNullable().defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 11. group_fund_members
  await knex.schema.createTable('group_fund_members', (table) => {
    table.increments('id').primary();
    table.integer('group_fund_id').unsigned().notNullable().references('id').inTable('group_funds').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['owner', 'member']).notNullable().defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.unique(['group_fund_id', 'user_id']);
  });

  // 12. group_fund_invitations
  await knex.schema.createTable('group_fund_invitations', (table) => {
    table.increments('id').primary();
    table.integer('group_fund_id').unsigned().notNullable().references('id').inTable('group_funds').onDelete('CASCADE');
    table.integer('inviter_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('invitee_user_id').unsigned().nullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('invite_token', 64).nullable().unique();
    table.enum('status', ['pending', 'accepted', 'declined', 'expired']).notNullable().defaultTo('pending');
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['invitee_user_id', 'status']);
  });

  // 13. group_fund_goals
  await knex.schema.createTable('group_fund_goals', (table) => {
    table.increments('id').primary();
    table.integer('group_fund_id').unsigned().notNullable().references('id').inTable('group_funds').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.bigInteger('target_amount').notNullable();
    table.date('target_date').nullable();
    table.enum('status', ['accumulating', 'completed']).notNullable().defaultTo('accumulating');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 14. group_fund_transactions
  await knex.schema.createTable('group_fund_transactions', (table) => {
    table.increments('id').primary();
    table.integer('group_fund_id').unsigned().notNullable().references('id').inTable('group_funds').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.integer('wallet_id').unsigned().nullable().references('id').inTable('wallets').onDelete('SET NULL');
    table.enum('type', ['contribution', 'goal_completion']).notNullable();
    table.bigInteger('amount').notNullable();
    table.string('note', 255).nullable();
    table.date('occurred_on').notNullable();
    table.integer('goal_id').unsigned().nullable().references('id').inTable('group_fund_goals').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['group_fund_id', 'occurred_on']);
  });

  // 15. bills
  await knex.schema.createTable('bills', (table) => {
    table.increments('id').primary();
    table.integer('creator_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.enum('status', ['open', 'closed']).notNullable().defaultTo('open');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 16. bill_participants
  await knex.schema.createTable('bill_participants', (table) => {
    table.increments('id').primary();
    table.integer('bill_id').unsigned().notNullable().references('id').inTable('bills').onDelete('CASCADE');
    table.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('display_name', 100).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 17. bill_activities
  await knex.schema.createTable('bill_activities', (table) => {
    table.increments('id').primary();
    table.integer('bill_id').unsigned().notNullable().references('id').inTable('bills').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.bigInteger('total_amount').notNullable();
    table.integer('paid_by_participant_id').unsigned().notNullable().references('id').inTable('bill_participants');
    table.enum('split_type', ['equal', 'custom']).notNullable().defaultTo('equal');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 18. bill_activity_shares
  await knex.schema.createTable('bill_activity_shares', (table) => {
    table.increments('id').primary();
    table.integer('bill_activity_id').unsigned().notNullable().references('id').inTable('bill_activities').onDelete('CASCADE');
    table.integer('participant_id').unsigned().notNullable().references('id').inTable('bill_participants').onDelete('CASCADE');
    table.bigInteger('amount').notNullable();
    table.unique(['bill_activity_id', 'participant_id']);
  });

  // 19. bill_settlements
  await knex.schema.createTable('bill_settlements', (table) => {
    table.increments('id').primary();
    table.integer('bill_id').unsigned().notNullable().references('id').inTable('bills').onDelete('CASCADE');
    table.integer('debtor_participant_id').unsigned().notNullable().references('id').inTable('bill_participants');
    table.integer('creditor_participant_id').unsigned().notNullable().references('id').inTable('bill_participants');
    table.bigInteger('amount').notNullable();
    table.boolean('is_paid').notNullable().defaultTo(false);
    table.timestamp('paid_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 20. notifications
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['budget_alert', 'fund_invitation', 'fund_event']).notNullable();
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.json('data').nullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'is_read']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const tables = [
    'notifications',
    'bill_settlements',
    'bill_activity_shares',
    'bill_activities',
    'bill_participants',
    'bills',
    'group_fund_transactions',
    'group_fund_goals',
    'group_fund_invitations',
    'group_fund_members',
    'group_funds',
    'savings_goal_movements',
    'savings_goals',
    'budgets',
    'transactions',
    'categories',
    'wallet_transfers',
    'wallets',
    'sessions',
    'users'
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
