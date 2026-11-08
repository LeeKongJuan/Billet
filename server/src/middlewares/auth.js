import crypto from 'crypto';
import { db } from '../config/db.js';
import { createUnauthorized } from '../shared/errors.js';

export async function requireAuth(req, res, next) {
  try {
    const rawSid = req.cookies?.sid;
    if (!rawSid) {
      return next(createUnauthorized('Yêu cầu đăng nhập để tiếp tục'));
    }

    // SHA-256 hash of token
    const tokenHash = crypto.createHash('sha256').update(rawSid).digest('hex');

    const session = await db('sessions')
      .join('users', 'sessions.user_id', 'users.id')
      .where('sessions.id', tokenHash)
      .where('sessions.expires_at', '>', new Date())
      .select(
        'users.id',
        'users.display_name as displayName',
        'users.email'
      )
      .first();

    if (!session) {
      // Clear invalid cookie
      res.clearCookie('sid', { path: '/' });
      return next(createUnauthorized('Phiên đăng nhập đã hết hạn hoặc không hợp lệ'));
    }

    req.user = session;
    next();
  } catch (error) {
    next(error);
  }
}
