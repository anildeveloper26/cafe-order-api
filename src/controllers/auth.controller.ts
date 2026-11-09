import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { AdminModel } from '../models/Admin';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const admin = await AdminModel.findOne({ email: email.toLowerCase() });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const token = jwt.sign({ sub: String(admin._id), email: admin.email, role: 'admin' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
  res.json({ success: true, data: { token, admin: { email: admin.email } } });
}
