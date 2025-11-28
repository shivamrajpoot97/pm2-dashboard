import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    const result = await login(username, password);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message,
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Login failed', message: error.message },
      { status: 500 }
    );
  }
}
