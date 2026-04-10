import { cookies } from 'next/headers';

export interface User {
  username: string;
}

// Simple in-memory user store (for demo; in production, use a database)
const users: Record<string, string> = {};

const SESSION_COOKIE = 'logviewer_session';
const sessions: Record<string, string> = {}; // token -> username

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const username = sessions[token];
  if (!username) return null;
  return { username };
}

export function createSession(username: string): string {
  const token = generateToken();
  sessions[token] = username;
  return token;
}

export function destroySession(token: string): void {
  delete sessions[token];
}

export function registerUser(username: string, password: string): boolean {
  if (users[username]) return false;
  users[username] = password;
  return true;
}

export function validateUser(username: string, password: string): boolean {
  // Allow registration on first login attempt
  if (!users[username]) {
    users[username] = password;
    return true;
  }
  return users[username] === password;
}

export { SESSION_COOKIE };
