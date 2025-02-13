import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export type ParamsType = string | number | boolean | null | Date;

class Database {
  private static instance: Pool | null = null;

  private constructor() {}

  public static getInstance(): Pool {
    if (!Database.instance) {
      if (process.env.POSTGRES_DATABASE_URL) {
        Database.instance = new Pool({
          connectionString: process.env.POSTGRES_DATABASE_URL,
          max: 20,
          idleTimeoutMillis: 30000,
          ssl: {
            rejectUnauthorized: false, // Necessary for Heroku
          },
        });
      } else {
        // this code is for local development
        Database.instance = new Pool({
          user: process.env.DATABASE_USER,
          host: process.env.DATABASE_HOST,
          database: process.env.DATABASE_NAME,
          password: process.env.DATABASE_PASSWORD,
          port: parseInt(process.env.DATABASE_PORT || '5432', 10),
          max: 20, // Maximum number of clients in the pool
          idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        });
      }
    }
    return Database.instance;
  }
}

export const isPgDatabaseConnected = () => {
  let isDatabaseConnected = false;
  pgPool.connect((err, client, release) => {
    if (err) {
      console.error('Database connection error:', err.stack);
      isDatabaseConnected = false;
    } else {
      isDatabaseConnected = true;
      release(); // Release the client back to the pool
    }
  });
  return isDatabaseConnected;
};

export const pgPool = Database.getInstance();
export const pgQuery = (text: string, params?: ParamsType[]) => {
  const pool = Database.getInstance();
  return pool.query(text, params);
};
