import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import UserList from './components/UserList';
import VideoCall from './components/VideoCall';
import { WebRTCService } from './services/webrtc';
import { useAuthStore } from './store/authStore';
import { useCallStore } from './store/callStore';

const App: React.FC = () => {
  const { isAuthenticated, user, logout, token } = useAuthStore();
  const { isInCall, setCallState } = useCallStore();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && token && !webrtcService) {
      const service = new WebRTCService(token);
      
      // Set current user for validation
      if (user?.username) {
        service.setCurrentUser(user.username);
      }
      
      // Set up event handlers
      service.onRemoteStreamCallback((stream) => {
        // Handle remote stream
        console.log('Remote stream received');
      });
      
      service.onCallRequestCallback((from) => {
        console.log('Incoming call from:', from);
        // Handle incoming call
      });
      
      service.onCallAcceptCallback((from) => {
        console.log('Call accepted by:', from);
      });
      
      service.onCallRejectCallback((from) => {
        console.log('Call rejected by:', from);
      });
      
      service.onCallEndCallback(() => {
        console.log('Call ended');
      });
      
      // Initialize with retry logic
      const initializeService = async () => {
        try {
          await service.initialize();
          await service.connectWebSocket();
          setWebrtcService(service);
          console.log('WebRTC service initialized successfully');
        } catch (error) {
          console.error('Failed to initialize WebRTC service:', error);
          // Retry after 3 seconds
          setTimeout(() => {
            console.log('Retrying WebRTC initialization...');
            initializeService();
          }, 3000);
        }
      };
      
      initializeService();
    }

    return () => {
      if (webrtcService) {
        webrtcService.cleanup();
      }
    };
  }, [isAuthenticated, token, webrtcService, user?.username]);

  const handleCallUser = (username: string) => {
    // Additional validation to prevent self-call
    if (user?.username && username === user.username) {
      console.error('Cannot call yourself');
      return;
    }
    
    setSelectedUser(username);
    setCallState({
      isInCall: true,
      isCaller: true,
      remoteUser: username,
    });
  };

  const handleEndCall = () => {
    setCallState({
      isInCall: false,
      isCaller: false,
      remoteUser: null,
    });
    setSelectedUser(null);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Video Call App</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.username}!</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <UserList onCallUser={handleCallUser} currentUser={user?.username || null} />
        </div>
      </main>

      {/* Video Call Overlay */}
      {isInCall && <VideoCall onEndCall={handleEndCall} />}
    </div>
  );
};

export default App; 