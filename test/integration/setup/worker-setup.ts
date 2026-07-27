import {
  applyTestEnvironment,
  buildWorkerDatabaseName,
  readContainerState,
} from './container-state';
import { TestDatabaseManager } from './test-database-manager';

async function workerSetup(): Promise<void> {
  const state = await readContainerState();
  const workerId = process.env.JEST_WORKER_ID;

  if (!workerId) {
    throw new Error('JEST_WORKER_ID is not defined');
  }

  const databaseName = buildWorkerDatabaseName(state, workerId);
  const databaseManager = new TestDatabaseManager(state);

  await databaseManager.createDatabase(databaseName, state.templateDatabase);
  applyTestEnvironment(state, databaseName);
}

export = workerSetup;
