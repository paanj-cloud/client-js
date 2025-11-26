import WebSocket from 'ws';
import { ClientEvent, ClientSubscription, ClientSubscribed } from './types/core-types';

export class ClientWebSocketClient {
    private ws: WebSocket | null = null;
    private apiKey: string;
    private wsUrl: string;
    private accessToken: string | null = null;
    private autoReconnect: boolean;
    private reconnectInterval: number;
    private maxReconnectAttempts: number;
    private reconnectAttempts: number = 0;
    private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
    private isConnected: boolean = false;
    private reconnectTimeout: any = null; // NodeJS.Timeout or number
    private backoffBase: number;
    private backoffMax: number;
    private jitter: boolean;

    constructor(
        apiKey: string,
        wsUrl: string,
        options: {
            autoReconnect?: boolean;
            reconnectInterval?: number;
            maxReconnectAttempts?: number;
            backoffBase?: number;
            backoffMax?: number;
            jitter?: boolean;
        } = {}
    ) {
        this.apiKey = apiKey;
        this.wsUrl = wsUrl;
        this.autoReconnect = options.autoReconnect ?? true;
        this.reconnectInterval = options.reconnectInterval ?? 5000;
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
        this.backoffBase = options.backoffBase ?? 0;
        this.backoffMax = options.backoffMax ?? 30000;
        this.jitter = options.jitter ?? true;
    }

    setAccessToken(token: string) {
        this.accessToken = token;
        // If connected, maybe reconnect to authenticate? 
        // Or send auth message? For now, let's assume token is needed for connection
        if (this.isConnected) {
            this.disconnect();
            this.connect();
        }
    }

    createWebSocket(url: string): WebSocket {
        // In browser environment, WebSocket is global
        const WS = typeof WebSocket !== 'undefined' ? WebSocket : global.WebSocket || require('ws');
        return new WS(url) as unknown as WebSocket;
    }

    async connect(): Promise<void> {
        if (!this.accessToken) {
            throw new Error('Access token required for connection. Authenticate first.');
        }

        return new Promise((resolve, reject) => {
            try {
                const token = this.accessToken || '';
                const url = `${this.wsUrl}/ws?token=${encodeURIComponent(token)}`;
                this.ws = this.createWebSocket(url);

                if (!this.ws) throw new Error('Failed to create WebSocket instance');

                this.ws.onopen = () => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    console.log('Paanj Client WebSocket connected');
                    resolve();
                };

                this.ws.onmessage = (event: any) => {
                    try {
                        const data = typeof event.data === 'string' ? event.data : event.data.toString();
                        const message = JSON.parse(data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    console.log('Paanj Client WebSocket disconnected');

                    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };

                this.ws.onerror = (error: any) => {
                    // console.error('Paanj Client WebSocket error:', error);
                    this.emit('error', error);
                    // Only reject if we're currently trying to connect
                    if (!this.isConnected) {
                        reject(error);
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectAttempts++;

        let delay = this.reconnectInterval;
        if (this.backoffBase > 0) {
            delay = this.backoffBase * Math.pow(2, this.reconnectAttempts - 1);
            if (this.backoffMax > 0) {
                delay = Math.min(delay, this.backoffMax);
            }
        }

        if (this.jitter) {
            // Add random jitter between 0 and 1000ms (or proportional)
            // Simple jitter: +/- 20%
            const jitterFactor = 0.8 + Math.random() * 0.4;
            delay = Math.floor(delay * jitterFactor);
        }

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.emit('reconnecting', this.reconnectAttempts);

        this.reconnectTimeout = setTimeout(() => {
            this.connect().catch((error) => {
                console.error('Reconnection failed:', error);
            });
        }, delay);
    }

    subscribe(subscription: ClientSubscription): void {
        if (!this.isConnected || !this.ws) {
            // Queue subscription or throw? For now throw
            throw new Error('WebSocket not connected');
        }

        this.ws.send(JSON.stringify(subscription));
    }

    send(data: any): void {
        if (!this.isConnected || !this.ws) {
            throw new Error('WebSocket not connected');
        }
        this.ws.send(JSON.stringify(data));
    }

    on(event: string, handler: (data: any) => void): () => void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                handlers.delete(handler);
            }
        };
    }

    private handleMessage(message: any): void {
        if (message.type === 'event') {
            const event = message as ClientEvent;

            // Emit to specific event listeners
            const eventKey = `${event.resource}:${event.resourceId}:${event.event}`;
            this.emit(eventKey, event.data);

            // Emit to global event listeners
            this.emit(event.event, event.data);
        } else if (message.type === 'subscribed') {
            const sub = message as ClientSubscribed;
            console.log(`Subscribed to ${sub.resource}:${sub.id || 'global'} events:`, sub.events);
        } else if (message.type === 'pong') {
            // Handle pong
        }
    }

    private emit(event: string, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    disconnect(): void {
        this.autoReconnect = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    isConnectedStatus(): boolean {
        return this.isConnected;
    }
}
