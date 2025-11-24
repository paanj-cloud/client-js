// Core types for Paanj Client SDK

export interface ClientOptions {
    apiKey: string;
    apiUrl?: string;
    wsUrl?: string;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export type Unsubscribe = () => void;

export interface ClientSubscription {
    type: 'subscribe' | 'unsubscribe';
    resource: string;
    id?: string;
    events: string[];
}

export interface ClientSubscribed {
    type: 'subscribed';
    resource: string;
    id?: string;
    events: string[];
}

export interface ClientEvent {
    type: 'event';
    event: string;
    resource: string;
    resourceId: string;
    data: any;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    userId: string;
}
