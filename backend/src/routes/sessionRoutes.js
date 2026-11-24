import express from 'express';
import { startAttempt, submitAttempt, getAttempts, getLeaderboard, getAttemptById, saveAttemptProgress } from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/leaderboard')
  .get(protect, getLeaderboard);

router.route('/')
  .post(protect, authorize('candidate'), startAttempt)
  .get(protect, getAttempts);

router.route('/:attemptId')
  .get(protect, getAttemptById);

router.route('/:attemptId/save')
  .patch(protect, authorize('candidate'), saveAttemptProgress);

router.route('/:attemptId/submit')
  .post(protect, authorize('candidate'), submitAttempt);

export default router;
