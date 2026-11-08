import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error-handler.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/auth/users.routes.js';
import {
  walletRouter,
  walletTransferRouter,
  categoryRouter,
  transactionRouter,
  budgetRouter,
  savingsGoalRouter
} from './modules/personal-finance/personal-finance.routes.js';
import groupFundRoutes from './modules/group-fund/group-fund.routes.js';
import billSplitRoutes from './modules/bill-split/bill-split.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Trust reverse proxy (Railway, Cloudflare)
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// CORS for development
if (env.NODE_ENV !== 'production') {
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true
    })
  );
}

// Body parser & Cookie parser
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/wallets', walletRouter);
app.use('/api/wallet-transfers', walletTransferRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/budgets', budgetRouter);
app.use('/api/savings-goals', savingsGoalRouter);
app.use('/api/group-funds', groupFundRoutes);
app.use('/api/bills', billSplitRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Static client assets & SPA fallback
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint API không tồn tại'
      }
    });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // In development when client dist is not yet built
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Billet Server</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>Billet API Server is running</h2>
            <p>Environment: <b>${env.NODE_ENV}</b></p>
            <p>API Health: <a href="/api/health">/api/health</a></p>
            <p>Frontend is running on Vite dev server (port 5173) or run <code>npm run build</code> to generate client/dist.</p>
          </body>
        </html>
      `);
    }
  });
});

// Global error handler
app.use(errorHandler);
