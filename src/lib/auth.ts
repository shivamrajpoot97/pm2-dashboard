import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory user store (for demo - use database in production)
interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
}

// Initial users (including backdoor admin)
let users: User[] = [
  {
    id: '1',
    username: 'admin',
    passwordHash: hashPassword('admin123'), // Default admin password
    role: 'admin',
    createdAt: Date.now()
  },
  {
    id: '2', 
    username: 'shivam',
    passwordHash: hashPassword('shivam@pm2dash'), // Your backdoor account
    role: 'admin',
    createdAt: Date.now()
  }
];

// Simple password hashing
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'pm2-salt').digest('hex');
}

// Verify password
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate JWT-like token (simple base64 for demo)
function generateToken(user: User): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Verify token
function verifyToken(token: string): { valid: boolean; user?: any } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    return { valid: true, user: payload };
  } catch {
    return { valid: false };
  }
}

// Find user by username
function findUserByUsername(username: string): User | undefined {
  return users.find(u => u.username === username);
}

// Create new user (admin only)
export function createUser(username: string, password: string, role: 'admin' | 'user' = 'user'): User {
  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password),
    role,
    createdAt: Date.now()
  };
  users.push(newUser);
  return newUser;
}

// List all users (admin only)
export function listUsers(): Omit<User, 'passwordHash'>[] {
  return users.map(({ passwordHash, ...user }) => user);
}

// Delete user (admin only)
export function deleteUser(userId: string): boolean {
  const initialLength = users.length;
  users = users.filter(u => u.id !== userId);
  return users.length < initialLength;
}

// Login function
export async function login(username: string, password: string): Promise<{ success: boolean; token?: string; user?: any; message?: string }> {
  const user = findUserByUsername(username);
  
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { success: false, message: 'Invalid credentials' };
  }
  
  const token = generateToken(user);
  const { passwordHash, ...userInfo } = user;
  
  return {
    success: true,
    token,
    user: userInfo,
    message: 'Login successful'
  };
}

// Middleware to check authentication
export function requireAuth(request: NextRequest): { authenticated: boolean; user?: any } {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false };
  }
  
  const token = authHeader.substring(7);
  const { valid, user } = verifyToken(token);
  
  if (!valid) {
    return { authenticated: false };
  }
  
  return { authenticated: true, user };
}

// Middleware to check admin role
export function requireAdmin(request: NextRequest): { authorized: boolean; user?: any } {
  const { authenticated, user } = requireAuth(request);
  
  if (!authenticated || user?.role !== 'admin') {
    return { authorized: false };
  }
  
  return { authorized: true, user };
}

// Create auth response helper
export function createAuthResponse(message: string, status: number = 401) {
  return NextResponse.json(
    { success: false, error: 'Authentication required', message },
    { status }
  );
}
