#!/usr/bin/env node

const bcrypt = require('bcryptjs');

async function hashPassword(password) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    return hash;
}

// Hash the demo password
hashPassword('password123').catch(console.error);