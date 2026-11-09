import { expect, type APIRequestContext } from '@playwright/test';
import { ADMIN, API_URL } from './env';

export interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  items: { name: string; quantity: number; subtotal: number; price: number }[];
  customer: { name: string; phone: string };
}

const url = (p: string) => `${API_URL}${p}`;

let phoneSeq = 0;
/** Unique valid Indian mobile number per call (starts with 9). */
export const uniquePhone = () => `9${String(Date.now()).slice(-6)}${String(phoneSeq++ % 1000).padStart(3, '0')}`;
export const uniqueName = (prefix: string) => `${prefix} ${Date.now().toString(36)}${phoneSeq++}`;

export async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(url('/auth/login'), { data: ADMIN });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data.token;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function findItem(request: APIRequestContext, search: string, available = 'all'): Promise<MenuItem> {
  const res = await request.get(url('/menu'), { params: { search, available } });
  const items: MenuItem[] = (await res.json()).data;
  // Prefer an exact (case-insensitive) name match; search also matches descriptions.
  const item = items.find((i) => i.name.toLowerCase() === search.toLowerCase()) ?? items.find((i) => i.name.toLowerCase().includes(search.toLowerCase())) ?? items[0];
  expect(item, `menu item matching "${search}"`).toBeTruthy();
  return item;
}

export async function createMenuItem(request: APIRequestContext, token: string, data: Partial<MenuItem> & { name: string }) {
  const res = await request.post(url('/menu'), { headers: auth(token), data: { category: 'coffee', price: 100, ...data } });
  expect(res.status()).toBe(201);
  return (await res.json()).data as MenuItem;
}

export async function placeOrder(request: APIRequestContext, items: { menuItem: string; quantity: number }[], phone = uniquePhone()) {
  const res = await request.post(url('/orders'), { data: { customer: { name: 'E2E Customer', phone }, tableNumber: 5, items } });
  expect(res.status()).toBe(201);
  return (await res.json()).data as Order;
}

export async function setOrderStatus(request: APIRequestContext, token: string, id: string, status: string) {
  const res = await request.patch(url(`/orders/${id}/status`), { headers: auth(token), data: { status } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data as Order;
}
