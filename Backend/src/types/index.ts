// Database types
export interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  plan: 'free' | 'pro';
  subscription_id?: string;
  subscription_status?: string;
  email_verified: boolean;
  google_id?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface DatabaseNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: 'default' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface DatabaseSession {
  id: string;
  user_id: string;
  refresh_token: string;
  expires_at: string;
  ip_address?: string;
  device_info?: Record<string, any>;
  created_at: string;
  last_used_at?: string;
}

// API types
export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro';
  subscriptionId?: string;
  subscriptionStatus?: string;
  emailVerified: boolean;
  avatarUrl?: string;
  preferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: 'default' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// Cache types
export interface CacheEntry {
  key: string;
  value: any;
  expiresAt?: number;
}

// Socket.IO types
export interface SocketUser {
  id: string;
  email: string;
  socketId: string;
}

export interface NoteUpdateEvent {
  type: 'create' | 'update' | 'delete' | 'restore';
  noteId: string;
  userId: string;
  note?: Note;
}

export interface AIJobUpdateEvent {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

// Request types
export interface AuthenticatedRequest extends Request {
  user: User;
}

// Utility types
export type NoteColor = 'default' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';
export type UserPlan = 'free' | 'pro';

// Helper functions
export function mapDatabaseUserToUser(dbUser: DatabaseUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    plan: dbUser.plan,
    subscriptionId: dbUser.subscription_id || undefined,
    subscriptionStatus: dbUser.subscription_status || undefined,
    emailVerified: dbUser.email_verified,
    avatarUrl: dbUser.avatar_url || undefined,
    preferences: dbUser.preferences || undefined,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    lastLoginAt: dbUser.last_login_at || undefined,
  };
}

export function mapDatabaseNoteToNote(dbNote: DatabaseNote): Note {
  return {
    id: dbNote.id,
    title: dbNote.title,
    content: dbNote.content,
    color: dbNote.color,
    isPinned: dbNote.is_pinned,
    isDeleted: dbNote.is_deleted,
    deletedAt: dbNote.deleted_at || undefined,
    createdAt: dbNote.created_at,
    updatedAt: dbNote.updated_at,
    version: dbNote.version,
  };
}