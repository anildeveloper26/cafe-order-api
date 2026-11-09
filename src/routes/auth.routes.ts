import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { loginLimiter } from '../middleware/rateLimit';
import { loginSchema } from '../validators/auth.schema';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));

export default router;
