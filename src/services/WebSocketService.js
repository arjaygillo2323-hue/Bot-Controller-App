class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = [];
  }

  connect(ipAddress, port = 81) {
    const url = `ws://${ipAddress}:${port}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this._notify({ type: "CONNECTED" });
    };

    this.socket.onmessage = (event) => {
      this._notify({ type: "MESSAGE", data: event.data });
    };

    this.socket.onerror = (error) => {
      this._notify({ type: "ERROR", error });
    };

    this.socket.onclose = () => {
      this._notify({ type: "DISCONNECTED" });
    };
  }

  send(commandString) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(commandString);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  _notify(event) {
    this.listeners.forEach((cb) => cb(event));
  }
}

export default new WebSocketService();