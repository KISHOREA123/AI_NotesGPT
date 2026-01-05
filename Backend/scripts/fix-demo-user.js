#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function fixDemoUser() {
    console.log('🔧 Fixing demo user password...\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing environment variables');
        return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    });
    
    try {
        // Generate proper password hash
        const passwordHash = await bcrypt.hash('password123', 12);
        console.log('✅ Generated password hash');
        
        // Update demo user
        const { data, error } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('email', 'demo@example.com')
            .select();
            
        if (error) {
            console.log('❌ Failed to update demo user:', error.message);
            return;
        }
        
        if (data && data.length > 0) {
            console.log('✅ Demo user password updated successfully');
            console.log(`   Email: ${data[0].email}`);
            console.log(`   Name: ${data[0].name}`);
            console.log('   Password: password123');
        } else {
            console.log('⚠️  Demo user not found');
        }
        
        console.log('\n🎉 Demo user is now ready for login!');
        console.log('   Try logging in with: demo@example.com / password123');
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

fixDemoUser().catch(console.error);