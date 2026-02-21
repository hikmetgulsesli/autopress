import fs from 'fs';
import path from 'path';
import { pool, query } from './connection';

interface MigrationRecord {
  name: string;
  executed_at: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(): Promise<MigrationRecord[]> {
  const result = await query('SELECT name, executed_at FROM _migrations ORDER BY executed_at');
  return result.rows;
}

async function recordMigration(name: string): Promise<void> {
  await query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
}

async function migrate() {
  const client = await pool.connect();
  try {
    // Ensure migrations tracking table exists
    await ensureMigrationsTable();
    
    const executedMigrations = await getExecutedMigrations();
    const executedNames = new Set(executedMigrations.map(m => m.name));
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    let runCount = 0;
    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`Skipping already executed migration: ${file}`);
        continue;
      }
      
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      // Execute in a transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Completed: ${file}`);
        runCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    
    if (runCount === 0) {
      console.log('No new migrations to run.');
    } else {
      console.log(`All migrations complete. ${runCount} new migration(s) executed.`);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Only run migrations when executed directly (not imported for tests)
if (require.main === module || process.argv[1]?.includes('migrate')) {
  migrate();
}

export { ensureMigrationsTable, getExecutedMigrations, recordMigration, migrate };
