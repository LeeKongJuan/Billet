import { authService } from './auth.service.js';
import { env } from '../../config/env.js';

const isProduction = env.NODE_ENV === 'production';

function setSessionCookie(res, token) {
  // Session cookie (no Max-Age / Expires, deleted when browser is closed)
  res.cookie('sid', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/'
  });
}

export const authController = {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.clearCookie('sid', { path: '/' });
      res.status(201).json({
        data: {
          user: result.user
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      setSessionCookie(res, result.token);
      res.json({
        data: {
          user: result.user
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const rawToken = req.cookies?.sid;
      await authService.logout(rawToken);
      res.clearCookie('sid', { path: '/' });
      res.json({
        data: {
          message: 'Đăng xuất thành công'
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res) {
    res.json({
      data: {
        user: req.user
      }
    });
  },

  async changePassword(req, res, next) {
    try {
      await authService.changePassword(req.user.id, req.body);
      res.json({
        data: {
          message: 'Đổi mật khẩu thành công'
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async searchUsers(req, res, next) {
    try {
      const q = req.query.q || '';
      const users = await authService.searchUsers(q, req.user.id);
      res.json({
        data: users
      });
    } catch (err) {
      next(err);
    }
  }
};
