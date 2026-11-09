export const CATEGORIES = ['coffee', 'tea', 'snacks', 'desserts', 'meals', 'beverages'] as const;
export type Category = (typeof CATEGORIES)[number];

export const MENU_SORTS = {
  name: { name: 1 },
  price_asc: { price: 1, name: 1 },
  price_desc: { price: -1, name: 1 },
  newest: { createdAt: -1 },
} as const;
export type MenuSort = keyof typeof MENU_SORTS;
export const MENU_SORT_KEYS = Object.keys(MENU_SORTS) as [MenuSort, ...MenuSort[]];

export const MENU_DEFAULT_LIMIT = 50;
export const MENU_MAX_LIMIT = 100;
