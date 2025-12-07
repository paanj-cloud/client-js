// Main exports for @paanj/client

// Runtime check for Node.js version
if (typeof process !== 'undefined' && process.release?.name === 'node') {
    const version = process.version.substring(1).split('.')[0];
    if (parseInt(version) < 18) {
        console.error(`\x1b[31mError: @paanj/client requires Node.js 18.0.0 or higher. Current version: ${process.version}\x1b[0m`);
        process.exit(1);
    }
}

export { PaanjClient } from './paanj-client.js';
export { ClientOptions, Unsubscribe, AuthResponse } from './types/core-types.js';

// Internal exports for feature packages
export { ClientWebSocketClient } from './websocket-client.js';
export { ClientHttpClient } from './http-client.js';
export type { ClientSubscription, ClientSubscribed, ClientEvent } from './types/core-types.js';
