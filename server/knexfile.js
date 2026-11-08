import { env } from './src/config/env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isSqlite = env.DB_CLIENT === 'better-sqlite3' || env.NODE_ENV === 'test';

const config = isSqlite
  ? {
      client: 'better-sqlite3',
      connection: {
        filename: path.join(__dirname, 'dev_test.sqlite')
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.join(__dirname, 'migrations'),
        loadExtensions: ['.js']
      },
      seeds: {
        directory: path.join(__dirname, 'seeds'),
        loadExtensions: ['.js']
      }
    }
  : {
      client: 'mysql2',
      connection: (env.DATABASE_URL || env.MYSQL_URL)
        ? (env.DATABASE_URL || env.MYSQL_URL)
        : {
            host: env.MYSQLHOST,
            port: env.MYSQLPORT,
            user: env.MYSQLUSER,
            password: env.MYSQLPASSWORD,
            database: env.MYSQLDATABASE,
            charset: 'utf8mb4',
            timezone: '+00:00',
            supportBigNumbers: true,
            bigNumberStrings: false
          },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: path.join(__dirname, 'migrations'),
        loadExtensions: ['.js']
      },
      seeds: {
        directory: path.join(__dirname, 'seeds'),
        loadExtensions: ['.js']
      }
    };

export default config;
