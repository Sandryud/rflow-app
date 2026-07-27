import { Client } from 'pg';

import * as containerState from './container-state';

const DOMAIN_TABLES = [
  'AuditEvent',
  'Comment',
  'Approval',
  'ChecklistItem',
  'ReleaseTask',
  'Release',
  'Environment',
  'Project',
  'Membership',
  'Organization',
  'User',
] as const;

const DUPLICATE_DATABASE_ERROR = '42P04';

export class TestDatabaseManager {
  constructor(private readonly state: containerState.ContainerState) {}

  async createDatabase(
    databaseName: string,
    templateDatabase?: string,
  ): Promise<void> {
    containerState.assertSafeDatabaseName(databaseName);

    if (templateDatabase) {
      containerState.assertSafeDatabaseName(templateDatabase);
    }

    const owner = quoteIdentifier(this.state.username);
    const database = quoteIdentifier(databaseName);
    const templateClause = templateDatabase
      ? ` TEMPLATE ${quoteIdentifier(templateDatabase)}`
      : '';

    try {
      await this.withClient(this.state.controlDatabase, async (client) => {
        await client.query(
          `CREATE DATABASE ${database} WITH OWNER ${owner}${templateClause}`,
        );
      });
    } catch (error) {
      if (!isDatabaseErrorWithCode(error, DUPLICATE_DATABASE_ERROR)) {
        throw error;
      }
    }
  }

  async sealTemplateDatabase(databaseName: string): Promise<void> {
    containerState.assertSafeDatabaseName(databaseName);

    await this.withClient(this.state.controlDatabase, async (client) => {
      await client.query(
        `ALTER DATABASE ${quoteIdentifier(databaseName)} WITH IS_TEMPLATE TRUE ALLOW_CONNECTIONS FALSE`,
      );
    });
  }

  async cleanDatabase(databaseName: string): Promise<void> {
    containerState.assertSafeDatabaseName(databaseName);

    await this.withClient(databaseName, async (client) => {
      const result = await client.query<{ database_name: string }>(
        'SELECT current_database() AS database_name',
      );

      if (result.rows[0]?.database_name !== databaseName) {
        throw new Error(
          `Connected to unexpected database: ${JSON.stringify(result.rows[0]?.database_name)}`,
        );
      }

      const tables = DOMAIN_TABLES.map(quoteIdentifier).join(', ');
      await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
    });
  }

  private async withClient<T>(
    databaseName: string,
    callback: (client: Client) => Promise<T>,
  ): Promise<T> {
    const client = new Client({
      connectionString: containerState.buildDatabaseUrl(
        this.state,
        databaseName,
      ),
    });

    await client.connect();

    try {
      return await callback(client);
    } finally {
      await client.end();
    }
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function isDatabaseErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as Error & { code?: string }).code === code
  );
}
