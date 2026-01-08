
import { supabaseAdmin } from '../src/config/supabase.js';

async function inspectSchema() {
    console.log('Inspecting Database Schema...');

    const tables = ['bots', 'bot_workflows'];

    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);
        // Query information_schema to get columns
        // Note: Supabase JS client usually restricts access to system tables (information_schema) via the API depending on settings.
        // If this fails, we'll try a different approach (selecting * limit 0 to see returned structure if possible, though strict typing might hide it).
        // A better way via RPC if available, but let's try direct query first IF the user has exposed it.
        // Actually, most standard setups block this.

        // Alternative: Try to select one row and see what keys we get.
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .limit(1);

        if (error) {
            console.error(`Error querying ${table}:`, error.message);
        } else {
            if (data && data.length > 0) {
                console.log('Columns found in data:', Object.keys(data[0]));
            } else {
                console.log('Table is empty, cannot infer columns from data.');
                // If empty, we can try to insert a dummy record with JUST the ID to see what fails? No, that's destructive.
                // Let's rely on the error message the user gave us: "organization_id" does not exist.
            }
        }
    }
}

inspectSchema().catch(console.error);
