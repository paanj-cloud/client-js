// Polyfill fetch for Node.js < 18
import fetch from 'node-fetch';

/**
 * Base HTTP client for making authenticated requests to Paanj API
 */
export class ClientHttpClient {
    private apiKey: string;
    private apiUrl: string;
    private accessToken: string | null = null;
    private refreshTokenCallback: (() => Promise<void>) | null = null;
    private isRefreshing: boolean = false;
    private refreshPromise: Promise<void> | null = null;

    constructor(apiKey: string, apiUrl: string) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    /**
     * Set callback for token refresh
     * @internal
     */
    setRefreshTokenCallback(callback: () => Promise<void>) {
        this.refreshTokenCallback = callback;
    }

    setAccessToken(token: string) {
        this.accessToken = token;
    }

    /**
     * Make an authenticated HTTP request
     * Automatically refreshes token on 401 errors and retries the request
     * @internal - For use by feature packages
     */
    async request<T>(
        method: string,
        path: string,
        body?: any,
        skipAuth: boolean = false,
        retryOn401: boolean = true
    ): Promise<T> {
        return this.executeRequest<T>(method, path, body, skipAuth, retryOn401);
    }

    /**
     * Internal method to execute request with automatic token refresh
     */
    private async executeRequest<T>(
        method: string,
        path: string,
        body?: any,
        skipAuth: boolean = false,
        retryOn401: boolean = true
    ): Promise<T> {
        const url = `${this.apiUrl}${path}`;
        const headers: Record<string, string> = {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
        };

        if (!skipAuth && this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const options: any = {
            method,
            headers,
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        // Use global fetch if available (browser), otherwise node-fetch
        const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch : fetch;

        const response = await fetchFn(url, options);

        // Handle 401 Unauthorized - token expired
        if (!response.ok && response.status === 401 && !skipAuth && retryOn401 && this.refreshTokenCallback) {
            // Wait for any ongoing refresh to complete
            if (this.isRefreshing && this.refreshPromise) {
                await this.refreshPromise;
            } else if (!this.isRefreshing) {
                // Trigger token refresh
                this.isRefreshing = true;
                this.refreshPromise = this.refreshTokenCallback().finally(() => {
                    this.isRefreshing = false;
                    this.refreshPromise = null;
                });
                await this.refreshPromise;
            }

            // Retry the request once with the new token
            return this.executeRequest<T>(method, path, body, skipAuth, false); // Don't retry again
        }

        if (!response.ok) {
            const text = await response.text();
            console.error(`HTTP Error ${response.status}: ${text}`);
            let error;
            try {
                error = JSON.parse(text);
            } catch {
                error = { error: 'Unknown error' };
            }
            throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json() as Promise<T>;
    }

    /**
     * Get the API URL
     * @internal
     */
    getApiUrl(): string {
        return this.apiUrl;
    }
}
