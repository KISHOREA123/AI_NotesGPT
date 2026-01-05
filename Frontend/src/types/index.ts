// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  plan: 'free' | 'pro';
}

// Note types
export type NoteColor = 'default' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// Subscription types
export interface SubscriptionPlan {
  id: 'free' | 'pro';
  name: string;
  price: number;
  priceINR: number;
  features: string[];
  isPopular?: boolean;
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark';
  primaryColor: string;
}

// API types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading?: boolean;
}
