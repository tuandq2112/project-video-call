import { create } from 'zustand';
import { CallState } from '../types';

interface CallStore extends CallState {
  setCallState: (state: Partial<CallState>) => void;
  resetCall: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setPeerConnection: (pc: RTCPeerConnection | null) => void;
}

export const useCallStore = create<CallStore>((set) => ({
  isInCall: false,
  isCaller: false,
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  
  setCallState: (newState) => set((state) => ({ ...state, ...newState })),
  
  resetCall: () => set({
    isInCall: false,
    isCaller: false,
    remoteUser: null,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
  }),
  
  setLocalStream: (stream) => set({ localStream: stream }),
  
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  
  setPeerConnection: (pc) => set({ peerConnection: pc }),
})); 