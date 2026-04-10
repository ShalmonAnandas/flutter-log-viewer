import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';

export interface User {
  username: string;
}

// Simple in-memory user store (for demo purposes only - not for production use)
const users: Record<string, string> = {};

const SESSION_COOKIE = 'logviewer_session';
const sessions: Record<string, { username: string; createdAt: number }> = {};

// Session expiry: 7 days
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function hashPassword(password: string, salt?: string): string {
  const useSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(useSalt + password).digest('hex');
  return useSalt + ':' + hash;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt] = stored.split(':');
  return hashPassword(password, salt) === stored;
}

function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const token of Object.keys(sessions)) {
    if (now - sessions[token].createdAt > SESSION_MAX_AGE_MS) {
      delete sessions[token];
    }
  }
}

export async function getSession(): Promise<User | null> {
  cleanExpiredSessions();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = sessions[token];
  if (!session) return null;
  return { username: session.username };
}

export function createSession(username: string): string {
  cleanExpiredSessions();
  const token = generateToken();
  sessions[token] = { username, createdAt: Date.now() };
  return token;
}

export function destroySession(token: string): void {
  delete sessions[token];
}

export function registerUser(username: string, password: string): boolean {
  if (users[username]) return false;
  users[username] = hashPassword(password);
  return true;
}

export function validateUser(username: string, password: string): boolean {
  // Allow registration on first login attempt
  if (!users[username]) {
    users[username] = hashPassword(password);
    return true;
  }
  return verifyPassword(password, users[username]);
}

export { SESSION_COOKIE };
