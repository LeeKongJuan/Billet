import { Router } from 'express';
import { billSplitController } from './bill-split.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import {
  createBillSchema,
  createActivitySchema,
  updateSettlementSchema
} from './bill-split.schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', billSplitController.getBills);
router.post('/', validateBody(createBillSchema), billSplitController.createBill);
router.get('/:id', billSplitController.getBillDetail);
router.post('/:id/activities', validateBody(createActivitySchema), billSplitController.addActivity);
router.post('/:id/close', billSplitController.closeBill);
router.patch('/:id/settlements/:settlementId', validateBody(updateSettlementSchema), billSplitController.updateSettlementPaid);

export default router;
