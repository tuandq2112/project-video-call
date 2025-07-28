import React, { useEffect, useState } from 'react';
import { userAPI } from '../services/api';
import { User } from '../types';

interface UserListProps {
  onCallUser: (username: string) => void;
  currentUser: string | null;
}

const UserList: React.FC<UserListProps> = ({ onCallUser, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getOnlineUsers();
      // Ensure users is always an array
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Online Users</h2>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Online Users ({users?.length || 0})</h2>
      {!users || users.length === 0 ? (
        <div className="text-gray-500">No users online</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.username}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="font-medium">
                  {user.username}
                  {currentUser && user.username === currentUser && (
                    <span className="ml-2 text-sm text-gray-500">(You)</span>
                  )}
                </span>
              </div>
              {currentUser && user.username !== currentUser && (
                <button
                  onClick={() => onCallUser(user.username)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Call
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList; 