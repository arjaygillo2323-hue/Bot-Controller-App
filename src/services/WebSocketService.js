class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = [];
  }

  connect(ipAddress, port = 81) {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {}

      this.socket = null;
    }

    const cleanIp = String(ipAddress || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');

    if (!cleanIp) {
      this._notify({
        type: 'ERROR',
        error: {
          message: 'Robot IP address is required.',
        },
      });
      return;
    }

    const url = `ws://${cleanIp}:${port}`;

    console.log('================================');
    console.log('ROBOT WEBSOCKET CONNECT');
    console.log('IP:', cleanIp);
    console.log('PORT:', port);
    console.log('URL:', url);
    console.log('================================');

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      console.log('================================');
      console.log('ROBOT WEBSOCKET OPEN');
      console.log('CONNECTED TO:', url);
      console.log('================================');

      this._notify({
        type: 'CONNECTED',
      });
    };

    socket.onmessage = (event) => {
      console.log(
        'ROBOT WEBSOCKET MESSAGE:',
        event.data
      );

      this._notify({
        type: 'MESSAGE',
        data: event.data,
      });
    };

    socket.onerror = (error) => {
      console.log('================================');
      console.log('ROBOT WEBSOCKET ERROR');
      console.log('URL:', url);
      console.log('ERROR:', error);
      console.log('ERROR TYPE:', typeof error);
      console.log(
        'ERROR KEYS:',
        Object.keys(error || {})
      );
      console.log('================================');

      this._notify({
        type: 'ERROR',
        error: {
          message: `Unable to connect to ${url}`,
          original: error,
        },
      });
    };

    socket.onclose = (event) => {
      console.log('================================');
      console.log('ROBOT WEBSOCKET CLOSED');
      console.log('CODE:', event?.code);
      console.log('REASON:', event?.reason);
      console.log('WAS CLEAN:', event?.wasClean);
      console.log('================================');

      if (this.socket === socket) {
        this.socket = null;
      }

      this._notify({
        type: 'DISCONNECTED',
        code: event?.code,
        reason: event?.reason,
        wasClean: event?.wasClean,
      });
    };
  }

  send(commandString) {
    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    ) {
      console.log(
        'ROBOT SEND:',
        commandString
      );

      this.socket.send(commandString);
    } else {
      console.log(
        'ROBOT SEND BLOCKED - SOCKET NOT OPEN'
      );
    }
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {}

      this.socket = null;
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);

    return () => {
      this.listeners =
        this.listeners.filter(
          (listener) => listener !== callback
        );
    };
  }

  _notify(event) {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.log(
          'WEBSOCKET LISTENER ERROR:',
          error
        );
      }
    });
  }
}

export default new WebSocketService();