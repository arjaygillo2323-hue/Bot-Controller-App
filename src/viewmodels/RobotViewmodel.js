import { create } from 'zustand';
import WebSocketService from '../services/WebSocketService';
import { CommandType, serializeCommand } from '../models/Command';
import { defaultTelemetry } from '../models/TelemetryData';

const useRobotViewModel = create((set, get) => ({
  // --- State ---
  connected: false,
  ipAddress: '',
  mode: 'MANUAL',
  speed: 50,
  telemetry: defaultTelemetry,
  errorMessage: null,

  // --- Actions ---
  connect: (ipAddress) => {
    WebSocketService.subscribe((event) => {
      if (event.type === 'CONNECTED') {
        set({ connected: true, errorMessage: null });
      }
      if (event.type === 'DISCONNECTED') {
        set({ connected: false });
      }
      if (event.type === 'ERROR') {
        set({ errorMessage: 'Connection error. Check IP and try again.' });
      }
      if (event.type === 'MESSAGE') {
        try {
          const data = JSON.parse(event.data);
          set({ telemetry: { ...data, timestamp: Date.now() } });
        } catch (e) {
          // Non-JSON message, ignore or log
        }
      }
    });

    WebSocketService.connect(ipAddress);
    set({ ipAddress });
  },

  disconnect: () => {
    WebSocketService.disconnect();
    set({ connected: false });
  },

  sendCommand: (type, value) => {
    const command = { type, value };
    WebSocketService.send(serializeCommand(command));
  },

  setMode: (newMode) => {
    const type = newMode === 'AUTO' ? CommandType.MODE_AUTO : CommandType.MODE_MANUAL;
    get().sendCommand(type);
    set({ mode: newMode });
  },

  setSpeed: (newSpeed) => {
    get().sendCommand(CommandType.SPEED, newSpeed);
    set({ speed: newSpeed });
  },

  move: (direction) => {
    // direction: 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT' | 'STOP'
    get().sendCommand(CommandType[direction]);
  },

  armAction: (action) => {
    // action: 'ARM_GRAB' | 'ARM_RELEASE' | 'ARM_HOME'
    get().sendCommand(CommandType[action]);
  },
}));

export default useRobotViewModel;