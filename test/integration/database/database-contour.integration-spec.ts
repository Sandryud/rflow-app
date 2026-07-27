import { Client } from 'pg';

type DatabaseContourRow = {
  databaseName: string;
  userTableExists: boolean;
  migrationsTableExists: boolean;
};

describe('Integration database contour', () => {
  it('provides an isolated worker database with the migrated schema', async () => {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    const client = new Client({ connectionString });
    await client.connect();

    try {
      const result = await client.query<DatabaseContourRow>(`
        SELECT
          current_database() AS "databaseName",
          to_regclass('public."User"') IS NOT NULL AS "userTableExists",
          to_regclass('public._prisma_migrations') IS NOT NULL AS "migrationsTableExists"
      `);

      expect(result.rows[0]).toEqual({
        databaseName: process.env.POSTGRES_DB,
        userTableExists: true,
        migrationsTableExists: true,
      });
    } finally {
      await client.end();
    }
  });
});
