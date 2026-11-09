import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

import { CATEGORIES } from '../constants/menu';

export { CATEGORIES, type Category } from '../constants/menu';

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, default: '', maxlength: 500 },
    category: { type: String, enum: CATEGORIES, required: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, trim: true, default: '' },
    isAvailable: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: true },
  },
  { timestamps: true },
);

menuItemSchema.index({ name: 'text', description: 'text' });
menuItemSchema.index({ category: 1, price: 1 });

export type MenuItem = InferSchemaType<typeof menuItemSchema>;
export type MenuItemDoc = HydratedDocument<MenuItem>;
export const MenuItemModel = model('MenuItem', menuItemSchema);
