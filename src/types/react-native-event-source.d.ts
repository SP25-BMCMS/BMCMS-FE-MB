declare module 'react-native-event-source' {
  export interface EventSourceInit {
    headers?: Record<string, string>;
  }

  export interface Event {
    data: string;
    type: string;
    lastEventId: string;
  }

  export default class EventSource {
    constructor(url: string, eventSourceInitDict?: EventSourceInit);
    addEventListener(type: string, listener: (event: Event) => void): void;
    removeEventListener(type: string, listener: (event: Event) => void): void;
    close(): void;
    CONNECTING: number;
    OPEN: number;
    CLOSED: number;
    readyState: number;
    url: string;
    withCredentials: boolean;
  }
} 