import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedDefaultAdmin() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM users`);

  if (rows[0].count > 0) return;

  const passwordHash = await bcrypt.hash("admin", 10);
  await pool.query(
    `INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, true)`,
    ["admin", passwordHash],
  );
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Migração leve para bancos criados antes do modelo de admin como checkbox.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      ) THEN
        UPDATE users SET is_admin = true WHERE role = 'admin';
        ALTER TABLE users DROP COLUMN role;
      END IF;
    END $$;
  `);

  await seedDefaultAdmin();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      owner_username TEXT NOT NULL,
      name TEXT NOT NULL,
      race TEXT,
      class TEXT,
      level INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS characters_owner_idx ON characters (owner_username);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quadrant_comments (
      id SERIAL PRIMARY KEY,
      grid_row INTEGER NOT NULL,
      grid_col INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_by TEXT NOT NULL,
      character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
      is_anonymous BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Migração leve para bancos criados antes do sistema de personagens.
  await pool.query(`ALTER TABLE quadrant_comments DROP COLUMN IF EXISTS author;`);
  await pool.query(`
    ALTER TABLE quadrant_comments
    ADD COLUMN IF NOT EXISTS character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL;
  `);
  await pool.query(`
    ALTER TABLE quadrant_comments
    ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS quadrant_comments_grid_idx
    ON quadrant_comments (grid_row, grid_col);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_pins (
      id SERIAL PRIMARY KEY,
      x DOUBLE PRECISION NOT NULL,
      y DOUBLE PRECISION NOT NULL,
      icon TEXT NOT NULL,
      label TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
