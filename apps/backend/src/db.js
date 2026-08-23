import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quadrant_comments (
      id SERIAL PRIMARY KEY,
      grid_row INTEGER NOT NULL,
      grid_col INTEGER NOT NULL,
      author TEXT,
      content TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS quadrant_comments_grid_idx
    ON quadrant_comments (grid_row, grid_col);
  `);
}
