import dotenv from 'dotenv';
import path from 'path';

// Load .env to get the REAL Clerk Secret Key
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const TEST_EMAIL = 'e2e-test-owner@fleetcare.app';
const TEST_PASSWORD = 'password123';

async function seedClerkUser() {
    if (!CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY not found in .env');
    }

    console.log('🔄 Checking if E2E user exists in Clerk...');

    // 1. Check if user exists
    const listRes = await fetch(`https://api.clerk.com/v1/users?email_address=${TEST_EMAIL}`, {
        headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` }
    });

    const users = await listRes.json();

    if (users.length > 0) {
        console.log('✅ User already exists:', users[0].id);
        return { email: TEST_EMAIL, password: TEST_PASSWORD };
    }

    // 2. Create user if not exists
    console.log('👤 Creating E2E user...');
    const createRes = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email_address: [TEST_EMAIL],
            password: TEST_PASSWORD,
            skip_password_checks: true,
            skip_legal_checks: true
        })
    });

    if (!createRes.ok) {
        const error = await createRes.json();
        throw new Error(`Failed to create user: ${JSON.stringify(error)}`);
    }

    const newUser = await createRes.json();
    console.log('✅ User created:', newUser.id);

    return { email: TEST_EMAIL, password: TEST_PASSWORD };
}

seedClerkUser().catch(console.error);
