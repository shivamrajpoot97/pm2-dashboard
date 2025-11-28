'use client';

import { useState } from 'react';
import { useAuth, useAuthFetch } from '@/lib/useAuth';
import { Server, Users, LogOut, UserPlus, Trash2 } from 'lucide-react';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const authFetch = useAuthFetch();
  const [showUserManager, setShowUserManager] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    try {
      const response = await authFetch('/api/auth/users');
      const result = await response.json();
      if (result.success) {
        setUsers(result.data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authFetch('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      const result = await response.json();
      if (result.success) {
        setNewUser({ username: '', password: '', role: 'user' });
        loadUsers(); // Refresh the list
        alert('User created successfully!');
      } else {
        alert(result.error || 'Failed to create user');
      }
    } catch (error) {
      alert('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;
    
    try {
      const response = await authFetch(`/api/auth/users?id=${userId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        loadUsers(); // Refresh the list
        alert('User deleted successfully!');
      } else {
        alert(result.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleUserManager = async () => {
    setShowUserManager(!showUserManager);
    if (!showUserManager) {
      await loadUsers();
    }
  };

  return (
    <>
      <header className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">PM2 Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.username}
                {user?.role === 'admin' && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    Admin
                  </span>
                )}
              </span>
              
              {isAdmin && (
                <button
                  onClick={handleUserManager}
                  className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </button>
              )}
              
              <button
                onClick={logout}
                className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* User Management Modal */}
      {showUserManager && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">User Management</h2>
              <button
                onClick={() => setShowUserManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Create User Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="text-lg font-semibold mb-3">Create New User</h3>
              <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="px-3 py-2 border rounded"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="px-3 py-2 border rounded"
                  required
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="px-3 py-2 border rounded"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Creating...' : 'Create'}</span>
                </button>
              </form>
            </div>

            {/* Users List */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Existing Users ({users.length})</h3>
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{u.username}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        u.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role}
                      </span>
                      <span className="text-sm text-gray-500">
                        Created: {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => deleteUser(u.id, u.username)}
                        className="flex items-center space-x-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Quick Access Credentials</h4>
              <div className="text-sm space-y-1">
                <p><strong>Admin:</strong> username: <code>admin</code> | password: <code>admin123</code></p>
                <p><strong>Your Backdoor:</strong> username: <code>shivam</code> | password: <code>shivam@pm2dash</code></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
