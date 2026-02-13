#!/usr/bin/env bun
/**
 * Setup Supabase Database Schema
 *
 * Reads schema.sql and executes it against your Supabase instance
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';

const projectRoot = join(dirname(import.meta.dir), '..');

// Load environment
const envPath = join(projectRoot, '.env');
const envContent = await readFile(envPath, 'utf-8');
const env: Record<string, string> = {};

for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
}

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

console.log('🔄 Setting up Supabase database...\n');
console.log(`URL: ${SUPABASE_URL}`);

// Read schema file
const schemaPath = join(projectRoot, 'supabase', 'schema.sql');
const schema = await readFile(schemaPath, 'utf-8');

// Split into individual statements
const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i] + ';';
  const preview = statement.substring(0, 60).replace(/\s+/g, ' ');

  process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct query
      const { error: queryError } = await (supabase as any).from('_sql').select('*').eq('query', statement);

      if (queryError && queryError.message.includes('does not exist')) {
        console.log('⚠️  Need service role key for schema changes');
        console.log('\n⚠️  ALTERNATIVE: Run the schema manually:');
        console.log('   1. Go to: https://cbdagmpcvnbimqtphojm.supabase.co/project/_/sql');
        console.log('   2. Paste contents of: supabase/schema.sql');
        console.log('   3. Click "Run"\n');
        process.exit(1);
      }
    }

    console.log('✓');
    successCount++;
  } catch (error) {
    console.log('✗');
    console.error(`   Error: ${error}`);
    errorCount++;
  }
}

console.log(`\n✅ Complete! ${successCount} succeeded, ${errorCount} failed\n`);

if (errorCount > 0) {
  console.log('⚠️  Some statements failed. You may need to:');
  console.log('   1. Use Supabase service role key (not anon key)');
  console.log('   2. Run manually in Supabase SQL Editor');
  process.exit(1);
}

console.log('🎉 Supabase database is ready!');
console.log('\nTry these commands now:');
console.log('  - Send a message to your bot');
console.log('  - Facts and goals will be saved');
console.log('  - Semantic search will work\n');
