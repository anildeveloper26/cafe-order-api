import type { Request, Response } from 'express';
import { loginAdmin } from '../services/auth.service';
import { sendOk } from '../utils/apiResponse';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  sendOk(res, await loginAdmin(email, password));
}
