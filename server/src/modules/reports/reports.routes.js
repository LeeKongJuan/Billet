import { Router } from 'express';
import { reportsController } from './reports.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/overview', reportsController.getOverview);
router.get('/expense-categories', reportsController.getExpenseCategories);
router.get('/trend', reportsController.getTrend);
router.get('/compare', reportsController.getComparison);

export default router;
