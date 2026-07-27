import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
  chmod,
  mkdtemp,
  readFile,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

export const POSTGRES_IMAGE = 'postgres:16-alpine';
export const CONTROL_DATABASE = 'rflow_it_control';
export const TEMPLATE_DATABASE = 'rflow_it_template';
export const TEST_DATABASE_PREFIX = 'rflow_it_';
export const CONTAINER_STATE_PATH_ENV =
  'RFLOW_INTEGRATION_CONTAINER_STATE_PATH';

const STATE_DIRECTORY_PREFIX = 'rflow-integration-';
const STATE_FILE_NAME = 'container-state.json';
const DATABASE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

export type ContainerState = {
  runId: string;
  host: string;
  port: number;
  username: string;
  password: string;
  controlDatabase: string;
  templateDatabase: string;
};

declare global {
  var __RFLOW_INTEGRATION_POSTGRES__: StartedPostgreSqlContainer | undefined;
  var __RFLOW_INTEGRATION_STATE_PATH__: string | undefined;
}

export function assertSafeDatabaseName(databaseName: string): void {
  if (
    !databaseName.startsWith(TEST_DATABASE_PREFIX) ||
    !DATABASE_NAME_PATTERN.test(databaseName)
  ) {
    throw new Error(
      `Unsafe integration database name: ${JSON.stringify(databaseName)}`,
    );
  }
}

export function buildDatabaseUrl(
  state: ContainerState,
  databaseName: string,
): string {
  assertSafeDatabaseName(databaseName);

  const url = new URL('postgresql://localhost');
  url.hostname = state.host;
  url.port = String(state.port);
  url.username = state.username;
  url.password = state.password;
  url.pathname = `/${databaseName}`;

  return url.toString();
}

export function buildWorkerDatabaseName(
  state: ContainerState,
  workerId: string,
): string {
  if (!/^[1-9]\d*$/.test(workerId)) {
    throw new Error(`Invalid JEST_WORKER_ID: ${JSON.stringify(workerId)}`);
  }

  const databaseName = `${TEST_DATABASE_PREFIX}${state.runId}_w${workerId}`;
  assertSafeDatabaseName(databaseName);

  return databaseName;
}

export function applyTestEnvironment(
  state: ContainerState,
  databaseName: string,
): void {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.POSTGRES_HOST = state.host;
  process.env.POSTGRES_PORT = String(state.port);
  process.env.POSTGRES_USER = state.username;
  process.env.POSTGRES_PASSWORD = state.password;
  process.env.POSTGRES_DB = databaseName;
  process.env.DATABASE_URL = buildDatabaseUrl(state, databaseName);
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_SECRET = 'rflow-integration-test-secret';
}

export async function createContainerStateFile(
  state: ContainerState,
): Promise<string> {
  const stateDirectory = await mkdtemp(join(tmpdir(), STATE_DIRECTORY_PREFIX));
  const statePath = join(stateDirectory, STATE_FILE_NAME);

  await writeFile(statePath, JSON.stringify(state), {
    encoding: 'utf8',
    mode: 0o600,
  });
  await chmod(statePath, 0o600);

  return statePath;
}

export async function readContainerState(
  statePath = getContainerStatePath(),
): Promise<ContainerState> {
  const rawState: unknown = JSON.parse(await readFile(statePath, 'utf8'));

  if (!isContainerState(rawState)) {
    throw new Error('Invalid integration container state file');
  }

  assertSafeDatabaseName(rawState.controlDatabase);
  assertSafeDatabaseName(rawState.templateDatabase);

  return rawState;
}

export function getContainerStatePath(): string {
  const statePath = process.env[CONTAINER_STATE_PATH_ENV];

  if (!statePath) {
    throw new Error(`${CONTAINER_STATE_PATH_ENV} is not defined`);
  }

  return statePath;
}

export async function removeContainerStateFile(
  statePath: string,
): Promise<void> {
  const resolvedStatePath = resolve(statePath);
  const stateDirectory = dirname(resolvedStatePath);
  const expectedDirectoryPrefix = resolve(
    join(tmpdir(), STATE_DIRECTORY_PREFIX),
  );

  if (
    basename(resolvedStatePath) !== STATE_FILE_NAME ||
    !stateDirectory.startsWith(expectedDirectoryPrefix)
  ) {
    throw new Error(
      `Refusing to remove unsafe integration state path: ${resolvedStatePath}`,
    );
  }

  await unlink(resolvedStatePath).catch((error: unknown) => {
    if (!isNodeErrorWithCode(error, 'ENOENT')) {
      throw error;
    }
  });
  await rmdir(stateDirectory).catch((error: unknown) => {
    if (!isNodeErrorWithCode(error, 'ENOENT')) {
      throw error;
    }
  });
}

function isContainerState(value: unknown): value is ContainerState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<ContainerState>;

  return (
    typeof state.runId === 'string' &&
    /^[a-f0-9]{12}$/.test(state.runId) &&
    typeof state.host === 'string' &&
    state.host.length > 0 &&
    typeof state.port === 'number' &&
    Number.isInteger(state.port) &&
    state.port > 0 &&
    typeof state.username === 'string' &&
    state.username.length > 0 &&
    typeof state.password === 'string' &&
    state.password.length > 0 &&
    typeof state.controlDatabase === 'string' &&
    typeof state.templateDatabase === 'string'
  );
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}
