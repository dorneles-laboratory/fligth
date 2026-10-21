interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string; bufferSize?: number; flowControl?: string }): Promise<void>;
  close(): Promise<void>;
  forget?(): Promise<void>;
}

interface SerialConnectionEvent extends Event {
  port: SerialPort;
}

interface Serial extends EventTarget {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

interface Navigator {
  serial?: Serial;
}
