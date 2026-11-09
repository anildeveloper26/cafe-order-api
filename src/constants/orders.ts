export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_NUMBER_PREFIX = 'ORD-';
export const ORDER_NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ORDER_NUMBER_LENGTH = 6;
export const ORDER_DEFAULT_LIMIT = 20;
export const STATS_DAYS = 7;
export const STATS_TOP_ITEMS = 5;
export const STATS_TIMEZONE = 'Asia/Kolkata';
