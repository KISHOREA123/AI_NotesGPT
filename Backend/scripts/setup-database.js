#!/usr/bin/env node

/**
 * Database Setup Script for AI Notes
 * 
 * This script helps you set up the Supabase database tables.
 * Run this after creating your Supabase project.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 AI Notes Database Setup');
console.log('==========================\n');

console.log('📋 To set up your Supabase database, follow these steps:\n');

console.log('1. 📱 Go to your Supabase Dashboard: https://supabase.com/dashboard');
console.log('2. 🏗️  Select your project (or create a new one)');
console.log('3. 📊 Navigate to the "SQL Editor" in the left sidebar');
console.log('4. 📝 Create a new query');
console.log('5. 📋 Copy and paste the contents of: Backend/database/schema.sql');
console.log('6. ▶️  Click "Run" to execute the SQL script');
console.log('7. ✅ Verify tables were created in the "Table Editor"\n');

console.log('📁 Schema file location:');
console.log(`   ${path.resolve(__dirname, '../database/schema.sql')}\n`);

console.log('🔧 After running the SQL script, your backend will automatically connect!');
console.log('   The database connection error will disappear on the next restart.\n');

console.log('💡 Tips:');
console.log('   - Make sure your .env file has the correct SUPABASE_URL and keys');
console.log('   - The schema includes sample data for testing');
console.log('   - Row Level Security (RLS) is enabled for data protection');
console.log('   - Full-text search is configured for notes\n');

console.log('🎯 What gets created:');
console.log('   ✓ users table (authentication & profiles)');
console.log('   ✓ notes table (your notes with full-text search)');
console.log('   ✓ attachments table (file uploads)');
console.log('   ✓ sessions table (refresh tokens)');
console.log('   ✓ ai_jobs table (AI processing jobs)');
console.log('   ✓ Indexes for performance');
console.log('   ✓ Security policies');
console.log('   ✓ Sample data for testing\n');

// Check if schema file exists
const schemaPath = path.join(__dirname, '../database/schema.sql');
if (fs.existsSync(schemaPath)) {
    console.log('✅ Schema file found and ready to use!');
    
    // Show first few lines of the schema
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const lines = schemaContent.split('\n').slice(0, 10);
    console.log('\n📄 Schema preview:');
    console.log('   ' + lines.join('\n   '));
    console.log('   ... (and more)\n');
} else {
    console.log('❌ Schema file not found! Please make sure you\'re in the Backend directory.');
}

console.log('🚀 Ready to set up your database? Follow the steps above!');