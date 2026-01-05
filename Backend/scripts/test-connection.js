#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * Tests the connection to your Supabase database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
    console.log('🔍 Testing Supabase Database Connection...\n');
    
    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing environment variables:');
        if (!supabaseUrl) console.log('   - SUPABASE_URL is not set');
        if (!supabaseKey) console.log('   - SUPABASE_SERVICE_KEY is not set');
        console.log('\n💡 Make sure your .env file is configured correctly.');
        return;
    }
    
    console.log('✅ Environment variables found');
    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    console.log(`🔑 Service Key: ${supabaseKey.substring(0, 20)}...`);
    
    try {
        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            }
        });
        
        console.log('\n🔗 Testing connection...');
        
        // Test 1: Basic connection
        const { data: connectionTest, error: connectionError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
            
        if (connectionError) {
            if (connectionError.message.includes('relation "public.users" does not exist')) {
                console.log('⚠️  Database tables not found!');
                console.log('📋 You need to run the database schema first.');
                console.log('💡 Follow the setup instructions in Backend/scripts/setup-database.js');
                return;
            }
            throw connectionError;
        }
        
        console.log('✅ Database connection successful!');
        
        // Test 2: Count tables
        const tables = ['users', 'notes', 'attachments', 'sessions', 'ai_jobs'];
        console.log('\n📊 Checking tables:');
        
        for (const table of tables) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                    
                if (error) throw error;
                console.log(`   ✅ ${table}: ${count} records`);
            } catch (error) {
                console.log(`   ❌ ${table}: ${error.message}`);
            }
        }
        
        // Test 3: Sample query
        console.log('\n🔍 Testing sample queries:');
        
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('email, name, plan')
            .limit(3);
            
        if (usersError) {
            console.log(`   ❌ Users query failed: ${usersError.message}`);
        } else {
            console.log(`   ✅ Found ${users.length} users:`);
            users.forEach(user => {
                console.log(`      - ${user.name} (${user.email}) - ${user.plan} plan`);
            });
        }
        
        const { data: notes, error: notesError } = await supabase
            .from('notes')
            .select('title, color, is_pinned')
            .limit(3);
            
        if (notesError) {
            console.log(`   ❌ Notes query failed: ${notesError.message}`);
        } else {
            console.log(`   ✅ Found ${notes.length} notes:`);
            notes.forEach(note => {
                console.log(`      - "${note.title}" (${note.color}${note.is_pinned ? ', pinned' : ''})`);
            });
        }
        
        console.log('\n🎉 Database is ready to use!');
        console.log('🚀 Your backend should now connect successfully.');
        
    } catch (error) {
        console.log(`\n❌ Connection failed: ${error.message}`);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check your Supabase project is active');
        console.log('   2. Verify your SUPABASE_URL and SUPABASE_SERVICE_KEY');
        console.log('   3. Make sure you\'ve run the database schema');
        console.log('   4. Check your internet connection');
    }
}

// Run the test
testConnection().catch(console.error);