# @paanj/client

> Core client SDK for Paanj platform - provides authentication and connection management

[![npm version](https://img.shields.io/npm/v/@paanj/client.svg)](https://www.npmjs.com/package/@paanj/client)
[![License](https://img.shields.io/badge/license-Custom-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## Overview

`@paanj/client` is the core package that provides:
- 🔐 **Authentication** - Anonymous and token-based authentication
- 🔌 **Connection Management** - WebSocket and HTTP client infrastructure
- 🔄 **Auto-Reconnection** - Built-in reconnection with exponential backoff
- 🌐 **Isomorphic** - Works in Node.js and Browser environments
- 🎯 **Base for Feature Packages** - Foundation for `@paanj/chat-client`, etc.

## Installation

```bash
npm install @paanj/client
```

## Usage

### Standalone Usage

```typescript
import { PaanjClient } from '@paanj/client';

const client = new PaanjClient({
  apiKey: 'pk_live_your_public_key',
  apiUrl: 'https://api.paanj.com',
  wsUrl: 'wss://ws.paanj.com'
});

// Authenticate
await client.authenticateAnonymous({
  name: 'John Doe'
});

// Connect to WebSocket
await client.connect();

// Check connection status
console.log(client.isConnected()); // true

// Disconnect
client.disconnect();
```

### With Feature Packages

The core package is typically used with feature packages:

```typescript
import { PaanjClient } from '@paanj/client';
import { ChatClient } from '@paanj/chat-client';

const client = new PaanjClient({ apiKey: 'pk_live_key' });
await client.authenticateAnonymous({ name: 'User' });
await client.connect();

// Initialize chat features
const chat = new ChatClient(client);
await chat.messages.send('conv_123', 'Hello!');
```

## API Reference

### PaanjClient

#### Constructor

```typescript
new PaanjClient(options: ClientOptions)
```

**Options:**
- `apiKey: string` - Public API key (required)
- `apiUrl?: string` - API server URL
- `wsUrl?: string` - WebSocket server URL
- `autoReconnect?: boolean` - Enable auto-reconnection (default: `true`)
- `reconnectInterval?: number` - Reconnect interval in ms (default: `5000`)
- `maxReconnectAttempts?: number` - Max reconnect attempts (default: `10`)

#### Methods

**`authenticateAnonymous(userData): Promise<AuthResponse>`**  
Authenticate as a new anonymous user.

**`authenticateWithToken(token: string): Promise<void>`**  
Authenticate with an existing access token.

**`connect(): Promise<void>`**  
Connect to the WebSocket server.

**`disconnect(): void`**  
Disconnect from the WebSocket server.

**`isConnected(): boolean`**  
Check if connected to WebSocket.

**`isAuthenticated(): boolean`**  
Check if authenticated.

**`getUserId(): string | null`**  
Get the current user ID.

## Security Best Practices

1. **Use Public Keys** - Only use public API keys in client-side code
2. **Secure Tokens** - Store access tokens securely (e.g., HttpOnly cookies or secure storage)
3. **HTTPS/WSS** - Always use secure connections in production

## Feature Packages

Build on top of `@paanj/client` with feature packages:

- [`@paanj/chat-client`](../chat-client) - Chat messaging and conversations
- `@paanj/voice-client` - Voice calls (coming soon)
- `@paanj/video-client` - Video calls (coming soon)

## TypeScript Support

This SDK is written in TypeScript and provides complete type definitions.

## License

This project is licensed under a custom license. See the [LICENSE](./LICENSE) file for details.

## Support

- 📧 Email: support@paanj.com
- 📖 Documentation: https://docs.paanj.com
- 🐛 Issues: https://github.com/paanj/chat-baas/issues

---

Made with ❤️ by the Paanj team
