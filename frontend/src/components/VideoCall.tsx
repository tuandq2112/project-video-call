import React, { useEffect, useRef, useState } from 'react';
import { WebRTCService } from '../services/webrtc';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';

interface VideoCallProps {
  onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ onEndCall }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [incomingCall, setIncomingCall] = useState<string | null>(null);
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);
  
  const {
    isInCall,
    isCaller,
    remoteUser,
    localStream,
    remoteStream,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    resetCall,
  } = useCallStore();
  
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token && !webrtcService) {
      const service = new WebRTCService(token);
      setWebrtcService(service);
      
      // Set up event handlers
      service.onRemoteStreamCallback((stream) => {
        setRemoteStream(stream);
      });
      
      service.onCallRequestCallback((from) => {
        setIncomingCall(from);
      });
      
      service.onCallAcceptCallback((from) => {
        setIncomingCall(null);
        // Handle call accepted
      });
      
      service.onCallRejectCallback((from) => {
        setIncomingCall(null);
        resetCall();
      });
      
      service.onCallEndCallback(() => {
        resetCall();
        onEndCall();
      });
      
      // Initialize WebRTC
      service.initialize().then(() => {
        service.connectWebSocket().then(() => {
          setLocalStream(service.getLocalStream());
          setPeerConnection(service.getPeerConnection());
        });
      });
    }
    
    return () => {
      if (webrtcService) {
        webrtcService.cleanup();
      }
    };
  }, [token, webrtcService, setLocalStream, setRemoteStream, setPeerConnection, resetCall, onEndCall]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleCallUser = async (username: string) => {
    if (webrtcService) {
      try {
        await webrtcService.makeCall(username);
        // Call state will be updated through WebSocket events
      } catch (error) {
        console.error('Error making call:', error);
        if (error instanceof Error && error.message === 'Cannot call yourself') {
          alert('You cannot call yourself!');
        } else {
          alert('Failed to make call. Please try again.');
        }
      }
    }
  };

  const handleAcceptCall = async () => {
    if (webrtcService && incomingCall) {
      try {
        await webrtcService.acceptCall(incomingCall);
        setIncomingCall(null);
      } catch (error) {
        console.error('Error accepting call:', error);
      }
    }
  };

  const handleRejectCall = () => {
    if (webrtcService && incomingCall) {
      webrtcService.rejectCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const handleEndCall = () => {
    if (webrtcService) {
      webrtcService.endCall();
    }
    resetCall();
    onEndCall();
  };

  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Incoming Call</h3>
          <p className="mb-6">{incomingCall} is calling you</p>
          <div className="space-x-4">
            <button
              onClick={handleAcceptCall}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Accept
            </button>
            <button
              onClick={handleRejectCall}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isInCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-40">
      <div className="relative w-full h-full max-w-6xl max-h-full p-4">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-lg"
        />
        
        {/* Local Video */}
        <div className="absolute top-4 right-4 w-48 h-36">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-lg border-2 border-white"
          />
        </div>
        
        {/* Call Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-4">
            <button
              onClick={handleEndCall}
              className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Call Info */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
          <p>Calling: {remoteUser}</p>
        </div>
      </div>
    </div>
  );
};

export default VideoCall; 