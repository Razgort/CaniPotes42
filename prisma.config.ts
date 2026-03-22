import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl =
  process.env['DATABASE_URL'] ??
  'postgresql://canifed:canifed@localhost:5432/canifed?schema=public';

export default defineConfig({
  schema: './libs/shared/prisma-client/prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
  migrate: {
    async adapter() {
      return new PrismaPg({ connectionString: databaseUrl });
    },
  },
});
