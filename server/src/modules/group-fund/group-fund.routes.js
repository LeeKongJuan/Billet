import { Router } from 'express';
import { groupFundController } from './group-fund.controller.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import {
  createGroupFundSchema,
  updateGroupFundSchema,
  contributeFundSchema,
  createFundGoalSchema,
  updateFundGoalSchema,
  inviteUsersSchema,
  transferOwnerSchema
} from './group-fund.schemas.js';

const router = Router();

// Public preview for invite link
router.get('/join-preview/:token', groupFundController.getPreviewJoin);

// All other endpoints require authentication
router.use(requireAuth);

router.get('/', groupFundController.getFunds);
router.post('/', validateBody(createGroupFundSchema), groupFundController.createFund);
router.get('/:id', groupFundController.getFundDetail);
router.put('/:id', validateBody(updateGroupFundSchema), groupFundController.updateFund);
router.post('/:id/contribute', validateBody(contributeFundSchema), groupFundController.contribute);

// Goals
router.post('/:id/goals', validateBody(createFundGoalSchema), groupFundController.createGoal);
router.put('/:id/goals/:goalId', validateBody(updateFundGoalSchema), groupFundController.updateGoal);
router.delete('/:id/goals/:goalId', groupFundController.deleteGoal);
router.post('/:id/goals/:goalId/complete', groupFundController.completeGoal);

// Invitations
router.post('/:id/invite', validateBody(inviteUsersSchema), groupFundController.inviteUsers);
router.get('/:id/invite-link', groupFundController.getInviteLink);
router.post('/join/:token', groupFundController.joinByToken);
router.post('/invitations/:invitationId/accept', groupFundController.acceptInvitation);
router.post('/invitations/:invitationId/decline', groupFundController.declineInvitation);

// Roles & lifecycle
router.post('/:id/transfer-owner', validateBody(transferOwnerSchema), groupFundController.transferOwner);
router.post('/:id/leave', groupFundController.leaveFund);
router.post('/:id/dissolve', groupFundController.dissolveFund);

export default router;
