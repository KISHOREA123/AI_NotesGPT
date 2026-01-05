#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function checkUsers() {
    console.log('🔍 Checking all users and their passwords...\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    });
    
    try {
        // Get all users
        const { data: users, error } = await supabase
            .from('users')
            .select('email, name, password_hash, created_at');
            
        if (error) {
            console.log('❌ Failed to get users:', error.message);
            return;
        }
        
        console.log(`Found ${users.length} users:\n`);
        
        for (const user of users) {
            console.log(`📧 ${user.email} (${user.name})`);
            console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
            console.log(`   Hash: ${user.password_hash.substring(0, 20)}...`);
            
            // Test if password123 works
            try {
                const isValid = await bcrypt.compare('password123', user.password_hash);
                console.log(`   Password 'password123': ${isValid ? '✅ Valid' : '❌ Invalid'}`);
            } catch (error) {
                console.log(`   Password test: ❌ Error - ${error.message}`);
            }
            console.log('');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

checkUsers().catch(console.error);