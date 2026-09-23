import { create } from 'zustand';

import WebSocketService from '../services/WebSocketService';
import {
  CommandType,
  serializeCommand,
} from '../models/Command';
import { defaultTelemetry } from '../models/TelemetryData';

const useRobotViewModel = create((set, get) => ({
  connected: false,

  // This stores whatever IP the user entered.
  // It is NOT a hardcoded IP.
  ipAddress: '',

  mode: 'MANUAL',

  speed: 50,

  telemetry: defaultTelemetry,

  errorMessage: null,

  connect: (ipAddress) => {
    const cleanIp = String(ipAddress || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');

    if (!cleanIp) {
      set({
        connected: false,
        errorMessage: 'Please enter the robot IP address.',
      });

      return;
    }

    // Save the manually entered IP.
    set({
      ipAddress: cleanIp,
      errorMessage: null,
      connected: false,
    });

    WebSocketService.connect(cleanIp, 81);
  },

  disconnect: () => {
    WebSocketService.disconnect();

    set({
      connected: false,
    });
  },

  sendCommand: (type, value) => {
    const command = {
      type,
      value,
    };

    WebSocketService.send(
      serializeCommand(command)
    );
  },

  setMode: (newMode) => {
    const type =
      newMode === 'AUTO'
        ? CommandType.MODE_AUTO
        : CommandType.MODE_MANUAL;

    get().sendCommand(type);

    set({
      mode: newMode,
    });
  },

  setSpeed: (newSpeed) => {
    get().sendCommand(
      CommandType.SPEED,
      newSpeed
    );

    set({
      speed: newSpeed,
    });
  },

  move: (direction) => {
    get().sendCommand(
      CommandType[direction]
    );
  },

  armAction: (action) => {
    get().sendCommand(
      CommandType[action]
    );
  },
}));

// One global WebSocket listener.
// This avoids creating another listener every time
// CONNECT is pressed.
WebSocketService.subscribe((event) => {
  const state = useRobotViewModel.getState();

  if (event.type === 'CONNECTED') {
    useRobotViewModel.setState({
      connected: true,
      errorMessage: null,
    });

    return;
  }

  if (event.type === 'DISCONNECTED') {
    useRobotViewModel.setState({
      connected: false,
    });

    return;
  }

  if (event.type === 'ERROR') {
    console.log(
      'ROBOT WEBSOCKET ERROR:',
      event.error
    );

    useRobotViewModel.setState({
      connected: false,
      errorMessage:
        event.error?.message ||
        'Robot WebSocket connection failed.',
    });

    return;
  }

  if (event.type === 'MESSAGE') {
    try {
      const data = JSON.parse(event.data);

      useRobotViewModel.setState({
        telemetry: {
          ...state.telemetry,
          ...data,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.log(
        'TELEMETRY PARSE ERROR:',
        error
      );
    }
  }
});

export default useRobotViewModel;