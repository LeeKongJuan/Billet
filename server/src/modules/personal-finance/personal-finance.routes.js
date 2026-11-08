import { Router } from 'express';
import { personalFinanceController } from './personal-finance.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import {
  createWalletSchema,
  updateWalletSchema,
  transferWalletSchema,
  createCategorySchema,
  updateCategorySchema,
  createTransactionSchema,
  updateTransactionSchema,
  createBudgetSchema,
  updateBudgetSchema,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
  depositSavingsGoalSchema,
  transferSavingsGoalSchema
} from './personal-finance.schemas.js';

export const walletRouter = Router();
walletRouter.use(requireAuth);
walletRouter.get('/', personalFinanceController.getWallets);
walletRouter.post('/', validateBody(createWalletSchema), personalFinanceController.createWallet);
walletRouter.put('/:id', validateBody(updateWalletSchema), personalFinanceController.updateWallet);
walletRouter.delete('/:id', personalFinanceController.deleteWallet);

export const walletTransferRouter = Router();
walletTransferRouter.use(requireAuth);
walletTransferRouter.post('/', validateBody(transferWalletSchema), personalFinanceController.transfer);

export const categoryRouter = Router();
categoryRouter.use(requireAuth);
categoryRouter.get('/', personalFinanceController.getCategories);
categoryRouter.post('/', validateBody(createCategorySchema), personalFinanceController.createCategory);
categoryRouter.put('/:id', validateBody(updateCategorySchema), personalFinanceController.updateCategory);
categoryRouter.delete('/', personalFinanceController.deleteCategories);

export const transactionRouter = Router();
transactionRouter.use(requireAuth);
transactionRouter.get('/', personalFinanceController.getTransactions);
transactionRouter.post('/', validateBody(createTransactionSchema), personalFinanceController.createTransaction);
transactionRouter.put('/:id', validateBody(updateTransactionSchema), personalFinanceController.updateTransaction);
transactionRouter.delete('/:id', personalFinanceController.deleteTransaction);
transactionRouter.post('/batch-delete', personalFinanceController.deleteBatchTransactions);

export const budgetRouter = Router();
budgetRouter.use(requireAuth);
budgetRouter.get('/current', personalFinanceController.getCurrentBudget);
budgetRouter.post('/', validateBody(createBudgetSchema), personalFinanceController.createBudget);
budgetRouter.put('/:id', validateBody(updateBudgetSchema), personalFinanceController.updateBudget);
budgetRouter.delete('/:id', personalFinanceController.deleteBudget);

export const savingsGoalRouter = Router();
savingsGoalRouter.use(requireAuth);
savingsGoalRouter.get('/', personalFinanceController.getSavingsGoals);
savingsGoalRouter.post('/', validateBody(createSavingsGoalSchema), personalFinanceController.createSavingsGoal);
savingsGoalRouter.put('/:id', validateBody(updateSavingsGoalSchema), personalFinanceController.updateSavingsGoal);
savingsGoalRouter.delete('/:id', personalFinanceController.deleteSavingsGoal);
savingsGoalRouter.post('/:id/deposit', validateBody(depositSavingsGoalSchema), personalFinanceController.depositSavingsGoal);
savingsGoalRouter.post('/transfer', validateBody(transferSavingsGoalSchema), personalFinanceController.transferSavingsGoals);
