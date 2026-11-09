import type { Category } from '../models/MenuItem';

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

export const menuData: Array<{
  name: string;
  description: string;
  category: Category;
  price: number;
  imageUrl: string;
  isVeg?: boolean;
  isAvailable?: boolean;
}> = [
  { name: 'Espresso', description: 'Single shot of rich, full-bodied espresso.', category: 'coffee', price: 99, imageUrl: img('photo-1510707577719-ae7c14805e3a') },
  { name: 'Cappuccino', description: 'Espresso topped with steamed milk and thick foam.', category: 'coffee', price: 149, imageUrl: img('photo-1572442388796-11668a67e53d') },
  { name: 'Cafe Latte', description: 'Smooth espresso with lots of steamed milk.', category: 'coffee', price: 159, imageUrl: img('photo-1561882468-9110e03e0f78') },
  { name: 'Caramel Macchiato', description: 'Vanilla milk, espresso and caramel drizzle.', category: 'coffee', price: 189, imageUrl: img('photo-1485808191679-5f86510681a2') },
  { name: 'Cold Brew', description: 'Slow-steeped for 18 hours, served over ice.', category: 'coffee', price: 179, imageUrl: img('photo-1461023058943-07fcbe16d735') },
  { name: 'Masala Chai', description: 'Black tea brewed with ginger, cardamom and spices.', category: 'tea', price: 79, imageUrl: img('photo-1571934811356-5cc061b6821f') },
  { name: 'Green Tea', description: 'Light, refreshing Japanese sencha.', category: 'tea', price: 89, imageUrl: img('photo-1556679343-c7306c1976bc') },
  { name: 'Iced Lemon Tea', description: 'Chilled black tea with fresh lemon and mint.', category: 'tea', price: 119, imageUrl: img('photo-1499638673689-79a0b5115d87') },
  { name: 'Mango Smoothie', description: 'Alphonso mango blended with yogurt.', category: 'beverages', price: 169, imageUrl: img('photo-1546173159-315724a31696') },
  { name: 'Chocolate Shake', description: 'Thick shake with Belgian chocolate and ice cream.', category: 'beverages', price: 199, imageUrl: img('photo-1572490122747-3968b75cc699') },
  { name: 'Fresh Lime Soda', description: 'Sweet or salted, with a squeeze of fresh lime.', category: 'beverages', price: 89, imageUrl: img('photo-1513558161293-cdaf765ed2fd') },
  { name: 'Veg Club Sandwich', description: 'Triple-decker with veggies, cheese and mint mayo.', category: 'snacks', price: 179, imageUrl: img('photo-1528735602780-2552fd46c7af') },
  { name: 'French Fries', description: 'Crispy salted fries with ketchup.', category: 'snacks', price: 119, imageUrl: img('photo-1573080496219-bb080dd4f877') },
  { name: 'Chicken Puff', description: 'Flaky pastry filled with spiced chicken.', category: 'snacks', price: 69, imageUrl: img('photo-1509440159596-0249088772ff'), isVeg: false },
  { name: 'Paneer Wrap', description: 'Tandoori paneer, onions and sauce in a soft wrap.', category: 'snacks', price: 159, imageUrl: img('photo-1626700051175-6818013e1d4f') },
  { name: 'Margherita Pizza', description: '8-inch pizza with tomato, mozzarella and basil.', category: 'meals', price: 249, imageUrl: img('photo-1574071318508-1cdbab80d002') },
  { name: 'Alfredo Pasta', description: 'Penne in a creamy parmesan white sauce.', category: 'meals', price: 229, imageUrl: img('photo-1645112411341-6c4fd023714a') },
  { name: 'Chicken Burger', description: 'Grilled chicken patty, lettuce and chipotle mayo.', category: 'meals', price: 219, imageUrl: img('photo-1568901346375-23c9450c58cd'), isVeg: false },
  { name: 'Chocolate Brownie', description: 'Warm fudgy brownie, served with chocolate sauce.', category: 'desserts', price: 129, imageUrl: img('photo-1606313564200-e75d5e30476c') },
  { name: 'Blueberry Cheesecake', description: 'New York style cheesecake with blueberry compote.', category: 'desserts', price: 199, imageUrl: img('photo-1533134242443-d4fd215305ad') },
  { name: 'Butter Croissant', description: 'Freshly baked, flaky and buttery.', category: 'desserts', price: 99, imageUrl: img('photo-1555507036-ab1f4038808a') },
  { name: 'Tiramisu', description: 'Coffee-soaked ladyfingers with mascarpone cream.', category: 'desserts', price: 219, imageUrl: img('photo-1571877227200-a0d98ea607e9'), isAvailable: false },
];
