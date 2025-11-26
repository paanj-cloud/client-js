import { PaanjClient } from '../src/paanj-client';

async function main() {
    try {
        console.log('Testing private data in user creation...\n');

        const client = new PaanjClient({
            apiKey: 'your_public_api_key_here',
            apiUrl: 'https://api.yourapp.com',
            wsUrl: 'wss://ws.yourapp.com'
        });

        console.log('Creating anonymous user with private data...');
        const userData = {
            name: 'Test User',
            metadata: {
                theme: 'dark',
                language: 'en'
            }
        };

        const privateData = {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            referrer: 'https://example.com',
            internalNotes: 'This is sensitive data that should only go to webhook'
        };

        const response = await client.authenticateAnonymous(userData, privateData);

        console.log('\n✓ User created successfully!');
        console.log('User ID:', response.userId);
        console.log('Access Token:', response.accessToken.substring(0, 20) + '...');
        console.log('\nNote: Private data was sent to the backend and will be forwarded to webhooks,');
        console.log('but it will NOT be stored in the database.');
        console.log('\nPrivate data sent:', JSON.stringify(privateData, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('\n✗ Test Failed:', err);
        process.exit(1);
    }
}

main();
