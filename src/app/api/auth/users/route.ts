import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUser, listUsers, deleteUser, createAuthResponse } from '@/lib/auth';

// GET: List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const { authorized, user } = requireAdmin(request);
    
    if (!authorized) {
      return createAuthResponse('Admin access required');
    }
    
    const users = listUsers();
    
    return NextResponse.json({
      success: true,
      data: {
        users,
        total: users.length,
        requestedBy: user.username
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to list users', message: error.message },
      { status: 500 }
    );
  }
}

// POST: Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const { authorized, user } = requireAdmin(request);
    
    if (!authorized) {
      return createAuthResponse('Admin access required');
    }
    
    const { username, password, role = 'user' } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Role must be either "user" or "admin"' },
        { status: 400 }
      );
    }
    
    const newUser = createUser(username, password, role);
    const { passwordHash, ...userInfo } = newUser;
    
    return NextResponse.json({
      success: true,
      message: `User '${username}' created successfully`,
      data: {
        user: userInfo,
        createdBy: user.username
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to create user', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { authorized, user } = requireAdmin(request);
    
    if (!authorized) {
      return createAuthResponse('Admin access required');
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }
    
    const deleted = deleteUser(userId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedBy: user.username
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete user', message: error.message },
      { status: 500 }
    );
  }
}
