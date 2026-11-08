/**
 * Add required transaction display names and support notes up to 100 words.
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  if (await knex.schema.hasColumn('transactions', 'name')) return;

  await knex.schema.alterTable('transactions', (table) => {
    table.string('name', 100).nullable();
    table.text('note').alter();
  });

  await knex('transactions')
    .whereNull('name')
    .update({
      name: knex.raw("SUBSTR(COALESCE(NULLIF(TRIM(note), ''), 'Giao dịch cũ'), 1, 100)")
    });

  await knex.schema.alterTable('transactions', (table) => {
    table.string('name', 100).notNullable().alter();
  });
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('name');
  });
}
