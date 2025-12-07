import { ClientOptions, Unsubscribe, ClientSubscription, AuthResponse } from './types/core-types.js';
import { ClientWebSocketClient } from './websocket-client.js';
import { ClientHttpClient } from './http-client.js';

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
    private refreshToken: string | null = null;
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

        // Set up automatic token refresh callback
        this.httpClient.setRefreshTokenCallback(async () => {
            await this.refreshAccessToken();
        });
    }

    /**
     * Authenticate as an anonymous user
     */
    async authenticateAnonymous(userData: { name: string; metadata?: any }, privateData?: any): Promise<AuthResponse> {
        const response = await this.httpClient.request<AuthResponse>(
            'POST',
            '/api/v1/users/anonymous',
            {
                user: userData,
                private: privateData
            },
            true // Skip auth header
        );

        this.setSession(response);

        // Emit user created event through WebSocket client event system
        this.wsClient.emit('user.created', {
            userId: response.userId,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken
        });

        return response;
    }

    /**
     * Authenticate with an existing token
     * @param token Access token
     * @param userId User ID (optional, can be extracted from token)
     * @param refreshToken Refresh token (required for token refresh functionality)
     */
    async authenticateWithToken(token: string, userId: string | undefined, refreshToken: string): Promise<void> {
        if (!refreshToken) {
            throw new Error('Refresh token is required for token refresh functionality');
        }

        this.accessToken = token;
        this.refreshToken = refreshToken;
        if (userId) this.userId = userId;

        this.wsClient.setAccessToken(token);
        this.httpClient.setAccessToken(token);

        // Emit token updated event through WebSocket client event system
        this.wsClient.emit('token.updated', {
            userId: this.userId,
            accessToken: token,
            refreshToken: refreshToken
        });
    }

    private setSession(session: AuthResponse) {
        this.accessToken = session.accessToken;
        this.refreshToken = session.refreshToken;
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
     * Get current refresh token
     */
    getRefreshToken(): string | null {
        return this.refreshToken;
    }

    /**
     * Refresh the access token using the stored refresh token
     * @returns New access token and refresh token
     */
    async refreshAccessToken(): Promise<AuthResponse> {
        if (!this.refreshToken) {
            throw new Error('No refresh token available. Call authenticateAnonymous() or authenticateWithToken() first.');
        }

        const response = await this.httpClient.request<{ accessToken: string; refreshToken: string }>(
            'POST',
            '/api/v1/auth/refresh',
            {
                refreshToken: this.refreshToken
            },
            true // Skip auth header (refresh endpoint doesn't require user auth)
        );

        // Update session with new tokens
        const authResponse: AuthResponse = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresIn: 0, // Not provided by refresh endpoint
            userId: this.userId || '' // Keep existing userId
        };

        this.setSession(authResponse);

        // Emit token updated event through WebSocket client event system
        this.wsClient.emit('token.updated', {
            userId: this.userId,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken
        });

        return authResponse;
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
     * Register event listener
     * Works for both WebSocket events (messages, etc.) and authentication events
     * 
     * @example
     * ```typescript
     * // Listen for authentication events
     * client.on('user.created', ({ userId, accessToken, refreshToken }) => {
     *   console.log('User created:', userId);
     *   // Store tokens securely
     * });
     * 
     * client.on('token.updated', ({ userId, accessToken, refreshToken }) => {
     *   console.log('Token refreshed');
     *   // Update stored tokens
     * });
     * 
     * // Listen for messages (same way)
     * client.on('message.create', (message) => {
     *   console.log('New message:', message);
     * });
     * ```
     */
    on(event: string, callback: (data: any) => void): Unsubscribe {
        return this.wsClient.on(event, callback);
    }
}
