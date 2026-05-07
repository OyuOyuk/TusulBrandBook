import pg from "pg";

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error("DATABASE_CONFIGURATION_MISSING: Neither DATABASE_URL nor DB_HOST is defined in environment variables.");
}

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const pool = new pg.Pool(poolConfig);

export default pool;