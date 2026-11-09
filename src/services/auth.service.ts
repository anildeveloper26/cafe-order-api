import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { AdminModel } from '../models/Admin';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import type { AdminTokenPayload } from '../middleware/auth';

export async function loginAdmin(email: string, password: string) {
  const admin = await AdminModel.findOne({ email: email.toLowerCase() });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const payload: AdminTokenPayload = { sub: String(admin._id), email: admin.email, role: 'admin' };
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] });
  return { token, admin: { email: admin.email } };
}
