import {
  CONTAINER_STATE_PATH_ENV,
  removeContainerStateFile,
} from './container-state';

export default async function globalTeardown(): Promise<void> {
  const container = globalThis.__RFLOW_INTEGRATION_POSTGRES__;
  const statePath =
    globalThis.__RFLOW_INTEGRATION_STATE_PATH__ ??
    process.env[CONTAINER_STATE_PATH_ENV];

  try {
    await container?.stop();
  } finally {
    if (statePath) {
      await removeContainerStateFile(statePath);
    }

    globalThis.__RFLOW_INTEGRATION_POSTGRES__ = undefined;
    globalThis.__RFLOW_INTEGRATION_STATE_PATH__ = undefined;
    delete process.env[CONTAINER_STATE_PATH_ENV];
  }
}
