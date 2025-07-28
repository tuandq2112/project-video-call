import { SignalingMessage } from '../types';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private ws: WebSocket | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onCallRequest: ((from: string) => void) | null = null;
  private onCallAccept: ((from: string) => void) | null = null;
  private onCallReject: ((from: string) => void) | null = null;
  private onCallEnd: (() => void) | null = null;
  private currentUser: string | null = null;

  constructor(private token: string) {}

  // Set current user for validation
  setCurrentUser(username: string): void {
    this.currentUser = username;
  }

  async initialize(): Promise<void> {
    // Get user media
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local stream to peer connection
    this.localStream.getTracks().forEach((track) => {
      if (this.peerConnection) {
        this.peerConnection.addTrack(track, this.localStream!);
      }
    });

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (this.onRemoteStream) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'ice-candidate',
          data: JSON.stringify(event.candidate),
        }));
      }
    };
  }

  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Include JWT token in WebSocket URL
      this.ws = new WebSocket(`ws://localhost:8080/api/ws?token=${this.token}`);
      
      let connectionTimeout: NodeJS.Timeout;
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        if (connectionTimeout) clearTimeout(connectionTimeout);
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: SignalingMessage = JSON.parse(event.data);
          this.handleSignalingMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        
        // If connection was closed before opening, reject the promise
        if (event.code === 1006 || event.code === 1000) {
          reject(new Error(`WebSocket closed: ${event.code} - ${event.reason}`));
        }
      };
      
      // Set timeout for connection
      connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000); // 10 second timeout
    });
  }

  private handleSignalingMessage(message: SignalingMessage): void {
    switch (message.type) {
      case 'call-request':
        if (this.onCallRequest) {
          this.onCallRequest(message.from);
        }
        break;
      case 'call-accept':
        if (this.onCallAccept) {
          this.onCallAccept(message.from);
        }
        break;
      case 'call-reject':
        if (this.onCallReject) {
          this.onCallReject(message.from);
        }
        break;
      case 'call-end':
        if (this.onCallEnd) {
          this.onCallEnd();
        }
        break;
      case 'offer':
        this.handleOffer(message);
        break;
      case 'answer':
        this.handleAnswer(message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(message);
        break;
    }
  }

  private async handleOffer(message: SignalingMessage): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = JSON.parse(message.data);
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      if (this.ws) {
        this.ws.send(JSON.stringify({
          type: 'answer',
          to: message.from,
          data: JSON.stringify(answer),
        }));
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  private async handleAnswer(message: SignalingMessage): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const answer = JSON.parse(message.data);
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  private async handleIceCandidate(message: SignalingMessage): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const candidate = JSON.parse(message.data);
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  async makeCall(to: string): Promise<void> {
    if (!this.peerConnection || !this.ws) return;

    // Prevent self-call
    if (this.currentUser && to === this.currentUser) {
      throw new Error("Cannot call yourself");
    }

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.ws.send(JSON.stringify({
        type: 'call-request',
        to,
        data: JSON.stringify(offer),
      }));
    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  async acceptCall(from: string): Promise<void> {
    if (!this.ws) return;

    this.ws.send(JSON.stringify({
      type: 'call-accept',
      to: from,
      data: '',
    }));
  }

  rejectCall(from: string): void {
    if (!this.ws) return;

    this.ws.send(JSON.stringify({
      type: 'call-reject',
      to: from,
      data: '',
    }));
  }

  endCall(): void {
    if (!this.ws) return;

    this.ws.send(JSON.stringify({
      type: 'call-end',
      data: '',
    }));
  }

  // Event handlers
  onRemoteStreamCallback(callback: (stream: MediaStream) => void): void {
    this.onRemoteStream = callback;
  }

  onCallRequestCallback(callback: (from: string) => void): void {
    this.onCallRequest = callback;
  }

  onCallAcceptCallback(callback: (from: string) => void): void {
    this.onCallAccept = callback;
  }

  onCallRejectCallback(callback: (from: string) => void): void {
    this.onCallReject = callback;
  }

  onCallEndCallback(callback: () => void): void {
    this.onCallEnd = callback;
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  getCurrentUser(): string | null {
    return this.currentUser;
  }

  // Cleanup
  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }
} 