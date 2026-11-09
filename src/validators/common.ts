import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

export const objectId = z.string().refine((v) => isValidObjectId(v), { message: 'Invalid id' });
export const idParams = z.object({ id: objectId });
