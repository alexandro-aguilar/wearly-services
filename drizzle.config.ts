import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './app/src/core/infrastructure/database/schema.ts',
  dbCredentials: {
    host: process.env.DB_HOST as string,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    database: process.env.DB_NAME as string,
    ssl: false,
  },
});
