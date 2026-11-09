import type { Response } from 'express';
import { HTTP } from '../constants/http';
import type { PaginationMeta } from './pagination';

/** Consistent success envelope: { success, message?, data, pagination? } */
export const sendOk = <T>(res: Response, data: T, message?: string) =>
  res.status(HTTP.OK).json({ success: true, ...(message ? { message } : {}), data });

export const sendCreated = <T>(res: Response, data: T, message?: string) =>
  res.status(HTTP.CREATED).json({ success: true, ...(message ? { message } : {}), data });

export const sendPaginated = <T>(res: Response, data: T[], pagination: PaginationMeta) =>
  res.status(HTTP.OK).json({ success: true, data, pagination });
