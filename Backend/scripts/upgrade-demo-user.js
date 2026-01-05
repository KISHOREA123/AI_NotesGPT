#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please check your .env file for SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function upgradeDemoUser() {
  console.log('🚀 Upgrading Demo User to Pro Plan');
  console.log('==================================');

  try {
    // Update demo user to Pro plan
    const { data, error } = await supabase
      .from('users')
      .update({ 
        plan: 'pro',
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'demo@example.com')
      .select();

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      console.log('✅ Demo user upgraded successfully!');
      console.log(`📧 Email: ${data[0].email}`);
      console.log(`👤 Name: ${data[0].name}`);
      console.log(`💎 Plan: ${data[0].plan}`);
      console.log(`📅 Updated: ${data[0].updated_at}`);
    } else {
      console.log('⚠️  Demo user not found or no changes made');
    }

  } catch (error) {
    console.error('❌ Failed to upgrade demo user:', error.message);
    process.exit(1);
  }
}

// Run the upgrade
upgradeDemoUser()
  .then(() => {
    console.log('\n🎉 Demo user upgrade completed!');
    console.log('You can now test Pro features with demo@example.com');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upgrade failed:', error);
    process.exit(1);
  });