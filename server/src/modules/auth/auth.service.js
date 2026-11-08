import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authRepository } from './auth.repository.js';
import { db } from '../../config/db.js';
import { encryptMoney } from '../../shared/encryption.js';
import { createBadRequest, createConflict, createUnauthorized } from '../../shared/errors.js';

const BCRYPT_ROUNDS = 12;
const SESSION_EXPIRY_DAYS = 7;

function generateSessionToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

export const authService = {
  async register({ displayName, email, password }) {
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      throw createConflict('Email này đã được đăng ký', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    return db.transaction(async (trx) => {
      const userId = await authRepository.createUser(
        { displayName, email, passwordHash },
        trx
      );

      // Seed default categories
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

      for (const cat of defaultCategories) {
        await trx('categories').insert({
          user_id: userId,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          status: 'active'
        });
      }

      // Seed default wallet: Tiền mặt with 0 balance
      await trx('wallets').insert({
        user_id: userId,
        name: 'Tiền mặt',
        description: 'Ví tiền mặt mặc định',
        balance: encryptMoney(0),
        status: 'active'
      });

      return {
        user: {
          id: userId,
          displayName,
          email: email.toLowerCase().trim()
        }
      };
    });
  },

  async login({ email, password }) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw createUnauthorized('Email hoặc mật khẩu không chính xác');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw createUnauthorized('Email hoặc mật khẩu không chính xác');
    }

    const { token, hash, expiresAt } = generateSessionToken();
    await authRepository.createSession(hash, user.id, expiresAt);

    return {
      token,
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email
      }
    };
  },

  async logout(rawToken) {
    if (rawToken) {
      const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await authRepository.deleteSession(hash);
    }
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw createUnauthorized('Người dùng không tồn tại');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw createBadRequest('Mật khẩu hiện tại không chính xác', 'INVALID_CURRENT_PASSWORD');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await authRepository.updatePassword(userId, newHash);
  },

  async searchUsers(query, excludeUserId) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return authRepository.searchUsers(query.trim(), excludeUserId);
  }
};
