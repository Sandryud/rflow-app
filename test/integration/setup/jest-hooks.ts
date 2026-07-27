import {
  assertSafeDatabaseName,
  buildWorkerDatabaseName,
  readContainerState,
} from './container-state';
import { TestDatabaseManager } from './test-database-manager';

let databaseManager: TestDatabaseManager;
let databaseName: string;

beforeAll(async () => {
  const state = await readContainerState();
  const workerId = process.env.JEST_WORKER_ID;

  if (!workerId) {
    throw new Error('JEST_WORKER_ID is not defined');
  }

  databaseName = buildWorkerDatabaseName(state, workerId);
  assertSafeDatabaseName(databaseName);

  if (
    process.env.NODE_ENV !== 'test' ||
    process.env.POSTGRES_DB !== databaseName
  ) {
    throw new Error('Unsafe integration test database environment');
  }

  databaseManager = new TestDatabaseManager(state);
});

beforeEach(async () => {
  await databaseManager.cleanDatabase(databaseName);
});
