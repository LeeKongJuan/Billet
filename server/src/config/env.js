import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET phải có ít nhất 16 ký tự').default('billet_default_session_secret_key_32chars'),
  DATA_ENCRYPTION_KEY: z.string().optional(),
  CLIENT_ORIGIN: z.string().optional().default('http://localhost:5173'),

  // MySQL connection
  MYSQLHOST: z.string().default('127.0.0.1'),
  MYSQLPORT: z.coerce.number().default(3306),
  MYSQLUSER: z.string().default('root'),
  MYSQLPASSWORD: z.string().default(''),
  MYSQLDATABASE: z.string().default('billet'),
  DATABASE_URL: z.string().optional(),
  MYSQL_URL: z.string().optional(),

  // Optional DB client override for testing or SQLite fallback
  DB_CLIENT: z.enum(['mysql2', 'better-sqlite3']).default('mysql2')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Cấu hình biến môi trường không hợp lệ:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
