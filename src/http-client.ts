// Polyfill fetch for Node.js < 18
import fetch from 'node-fetch';

/**
 * Base HTTP client for making authenticated requests to Paanj API
 */
export class ClientHttpClient {
    private apiKey: string;
    private apiUrl: string;
    private accessToken: string | null = null;

    constructor(apiKey: string, apiUrl: string) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    setAccessToken(token: string) {
        this.accessToken = token;
    }

    /**
     * Make an authenticated HTTP request
     * @internal - For use by feature packages
     */
    async request<T>(
        method: string,
        path: string,
        body?: any,
        skipAuth: boolean = false
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
