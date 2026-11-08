import { db } from '../../config/db.js';

export const authRepository = {
  async findByEmail(email) {
    return db('users')
      .whereRaw('LOWER(email) = ?', [email.toLowerCase().trim()])
      .first();
  },

  async findById(id) {
    return db('users').where({ id }).first();
  },

  async createUser(user, trx = db) {
    const [id] = await trx('users').insert({
      display_name: user.displayName,
      email: user.email.toLowerCase().trim(),
      password_hash: user.passwordHash
    });
    return id;
  },

  async createSession(tokenHash, userId, expiresAt, trx = db) {
    await trx('sessions').insert({
      id: tokenHash,
      user_id: userId,
      expires_at: expiresAt
    });
  },

  async deleteSession(tokenHash) {
    await db('sessions').where({ id: tokenHash }).del();
  },

  async updatePassword(userId, passwordHash) {
    await db('users').where({ id: userId }).update({
      password_hash: passwordHash,
      updated_at: db.fn.now()
    });
  },

  async searchUsers(query, excludeUserId) {
    const q = `%${query.toLowerCase()}%`;
    return db('users')
      .where('id', '!=', excludeUserId)
      .where((builder) => {
        builder.whereRaw('LOWER(display_name) LIKE ?', [q])
          .orWhereRaw('LOWER(email) LIKE ?', [q]);
      })
      .select('id', 'display_name as displayName', 'email')
      .limit(10);
  }
};
