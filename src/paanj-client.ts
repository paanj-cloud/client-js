import { ClientOptions, Unsubscribe, ClientSubscription, AuthResponse } from './types/core-types';
import { ClientWebSocketClient } from './websocket-client';
import { ClientHttpClient } from './http-client';

/**
 * PaanjClient - Core client SDK for Paanj platform
 * 
 * Provides authentication, connection management, and base infrastructure
 * for feature packages like @paanj/chat-client
 */
export class PaanjClient {
    private apiKey: string;
    private wsClient: ClientWebSocketClient;
    private httpClient: ClientHttpClient;
    private options: Required<ClientOptions>;
    private accessToken: string | null = null;
    private userId: string | null = null;

    constructor(options: ClientOptions) {
        if (!options.apiKey) {
            throw new Error('API Key is required');
        }

        this.apiKey = options.apiKey;
        this.options = {
            apiKey: options.apiKey,
            apiUrl: options.apiUrl || 'http://localhost:3000',
            wsUrl: options.wsUrl || 'ws://localhost:8090',
            autoReconnect: options.autoReconnect ?? true,
            reconnectInterval: options.reconnectInterval ?? 5000,
            maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
        };

        this.wsClient = new ClientWebSocketClient(this.apiKey, this.options.wsUrl, {
            autoReconnect: this.options.autoReconnect,
            reconnectInterval: this.options.reconnectInterval,
            maxReconnectAttempts: this.options.maxReconnectAttempts,
        });

        this.httpClient = new ClientHttpClient(this.apiKey, this.options.apiUrl);
    }

    /**
     * Authenticate as an anonymous user
     */
    async authenticateAnonymous(userData: { name: string; metadata?: any }): Promise<AuthResponse> {
        const response = await this.httpClient.request<AuthResponse>(
            'POST',
            '/api/v1/users/anonymous',
            { user: userData },
            true // Skip auth header
        );

        this.setSession(response);
        return response;
    }

    /**
     * Authenticate with an existing token
     */
    async authenticateWithToken(token: string): Promise<void> {
        // Verify token validity? For now just set it
        this.accessToken = token;
        this.wsClient.setAccessToken(token);
        this.httpClient.setAccessToken(token);
    }

    private setSession(session: AuthResponse) {
        this.accessToken = session.accessToken;
        this.userId = session.userId;
        this.wsClient.setAccessToken(session.accessToken);
        this.httpClient.setAccessToken(session.accessToken);
    }

    /**
     * Connect to the WebSocket server
     */
    async connect(): Promise<void> {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Call authenticateAnonymous() or authenticateWithToken() first.');
        }
        await this.wsClient.connect();
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect(): void {
        this.wsClient.disconnect();
    }

    /**
     * Check if connected to WebSocket
     */
    isConnected(): boolean {
        return this.wsClient.isConnectedStatus();
    }

    /**
     * Check if authenticated
     */
    isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    /**
     * Get current user ID
     */
    getUserId(): string | null {
        return this.userId;
    }

    /**
     * Get WebSocket client (for use by feature packages)
     * @internal
     */
    getWebSocket(): ClientWebSocketClient {
        return this.wsClient;
    }

    /**
     * Get HTTP client (for use by feature packages)
     * @internal
     */
    getHttpClient(): ClientHttpClient {
        return this.httpClient;
    }

    /**
     * Subscribe to events (for use by feature packages)
     * @internal
     */
    subscribe(subscription: ClientSubscription): void {
        this.wsClient.subscribe(subscription);
    }

    /**
     * Send a message via WebSocket (for use by feature packages)
     * @internal
     */
    sendWebSocketMessage(data: any): void {
        this.wsClient.send(data);
    }

    /**
     * Register event listener (for use by feature packages)
     * @internal
     */
    on(event: string, callback: (data: any) => void): Unsubscribe {
        return this.wsClient.on(event, callback);
    }
}
