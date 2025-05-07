import { create } from 'zustand';

const WS_URL = 'ws://localhost:8000/ws/status'; // Adjust if backend runs elsewhere

interface StatusState {
  latestStatus: string;
  isConnected: boolean;
  socket: WebSocket | null;
  reconnectAttempts: number;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  setStatus: (status: string) => void; // Helper to update status directly
}

const maxReconnectAttempts = 5;
const reconnectInterval = 5000; // 5 seconds

export const useStatusStore = create<StatusState>((set, get) => ({
  latestStatus: '',
  isConnected: false,
  socket: null,
  reconnectAttempts: 0,

  setStatus: (status: string) => set({ latestStatus: status }),

  connectWebSocket: () => {
    // Prevent multiple connections
    if (get().socket && get().socket?.readyState < 2) { // CONNECTING or OPEN
        console.warn('WebSocket already connecting or connected.');
        return;
    }
    console.log('Attempting to connect WebSocket...');
    set({ latestStatus: 'Connecting to status service...' });

    const newSocket = new WebSocket(WS_URL);

    newSocket.onopen = () => {
      console.log('WebSocket connected.');
      set({ isConnected: true, latestStatus: 'Status service connected.', reconnectAttempts: 0, socket: newSocket });
      // Clear status after a delay
      setTimeout(() => {
        if (get().latestStatus === 'Status service connected.') {
           set({ latestStatus: '' });
        }
      }, 3000);
    };

    newSocket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      set({ latestStatus: event.data }); // Update status
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ latestStatus: 'Status service connection error.' });
      // Don't set isConnected false here, wait for onclose
    };

    newSocket.onclose = (event) => {
      console.warn('WebSocket disconnected:', event.code, event.reason);
      set(state => ({ 
          isConnected: false, 
          socket: null, 
          latestStatus: state.reconnectAttempts < maxReconnectAttempts 
                        ? 'Status service disconnected. Attempting to reconnect...' 
                        : 'Status service disconnected. Max reconnect attempts reached.' 
      }));
      
      // Attempt to reconnect with delay and limit
      if (get().reconnectAttempts < maxReconnectAttempts) {
        const attempts = get().reconnectAttempts + 1;
        set({ reconnectAttempts: attempts });
        console.log(`WebSocket reconnect attempt ${attempts}/${maxReconnectAttempts} in ${reconnectInterval / 1000}s...`);
        setTimeout(get().connectWebSocket, reconnectInterval);
      } else {
        console.error('WebSocket max reconnect attempts reached.');
        set({ latestStatus: 'Status service disconnected. Please check backend and refresh.' });
      }
    };
    
    // Assign socket to state ONLY AFTER defining handlers, though it's assigned in onopen too.
    // set({ socket: newSocket }); // Redundant due to onopen setting it
  },

  disconnectWebSocket: () => {
    const currentSocket = get().socket;
    if (currentSocket) {
      console.log('Disconnecting WebSocket manually.');
      set({ reconnectAttempts: maxReconnectAttempts }); // Prevent auto-reconnect
      currentSocket.close();
      set({ socket: null, isConnected: false, latestStatus: '' });
    }
  },
}));

// Optional: Initiate connection immediately when store is first used/imported?
// This can sometimes be tricky with SSR or fast refresh.
// It's often better to trigger connection explicitly from a component (e.g., App.tsx useEffect).
// useStatusStore.getState().connectWebSocket();
