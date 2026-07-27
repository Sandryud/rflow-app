import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import * as containerState from './container-state';
import { TestDatabaseManager } from './test-database-manager';

const POSTGRES_USERNAME = 'rflow_test';
const POSTGRES_PASSWORD = 'rflow_test';

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';

  const container = await new PostgreSqlContainer(containerState.POSTGRES_IMAGE)
    .withDatabase(containerState.CONTROL_DATABASE)
    .withUsername(POSTGRES_USERNAME)
    .withPassword(POSTGRES_PASSWORD)
    .start();

  globalThis.__RFLOW_INTEGRATION_POSTGRES__ = container;

  try {
    const state: containerState.ContainerState = {
      runId: randomUUID().replaceAll('-', '').slice(0, 12),
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      controlDatabase: container.getDatabase(),
      templateDatabase: containerState.TEMPLATE_DATABASE,
    };
    const databaseManager = new TestDatabaseManager(state);

    await databaseManager.createDatabase(state.templateDatabase);
    await runPrismaMigrations(
      containerState.buildDatabaseUrl(state, state.templateDatabase),
    );
    await databaseManager.sealTemplateDatabase(state.templateDatabase);

    const statePath = await containerState.createContainerStateFile(state);
    process.env[containerState.CONTAINER_STATE_PATH_ENV] = statePath;
    globalThis.__RFLOW_INTEGRATION_STATE_PATH__ = statePath;
  } catch (error) {
    await container.stop();
    globalThis.__RFLOW_INTEGRATION_POSTGRES__ = undefined;
    throw error;
  }
}

async function runPrismaMigrations(databaseUrl: string): Promise<void> {
  const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  await new Promise<void>((resolve, reject) => {
    const migration = spawn(
      npmExecutable,
      ['exec', 'prisma', '--', 'migrate', 'deploy'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          NODE_ENV: 'test',
        },
        shell: false,
        stdio: 'inherit',
      },
    );

    migration.once('error', reject);
    migration.once('exit', (exitCode, signal) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Prisma migrations failed with exit code ${String(exitCode)} and signal ${String(signal)}`,
        ),
      );
    });
  });
}
