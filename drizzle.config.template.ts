import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/adapters/db/schema.ts',
  dbCredentials: {
    host: '<YOUR_HOST>',
    port: 5432,
    user: '<YOUR_USER>',
    password: '<YOUR_PASSWORD>',
    database: '<YOUR_DATABASE>',
    ssl: false,
  },
});
