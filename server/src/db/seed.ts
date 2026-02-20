import bcrypt from 'bcryptjs';
import { pool, query } from './connection';

async function seed() {
  try {
    // Default admin user
    const hash = await bcrypt.hash('autopress2026', 12);
    await query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
      ['admin@autopress.local', hash, 'Admin', 'admin']
    );

    // Default settings
    const settings = [
      ['default_language', 'tr', 'string'],
      ['default_ai_model', 'gpt-4o', 'string'],
      ['publish_jitter_minutes', '15', 'number'],
      ['seo_min_word_count', '800', 'number'],
      ['auto_internal_linking', 'true', 'boolean'],
    ];
    for (const [key, value, type] of settings) {
      await query(
        `INSERT INTO settings (key, value, type) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
        [key, value, type]
      );
    }

    console.log('Seed completed.');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
