type CursorParams = {
  id: string;
  createdAt: Date;
};

export function encodeCursor({ createdAt, id }: CursorParams) {
  const dateIso = new Date(createdAt).toISOString();

  const encodeCursor = Buffer.from(
    JSON.stringify({ id, createdAt: dateIso }),
    'utf-8',
  ).toString('base64url');

  return encodeCursor;
}

export function decodeCursor(cursor: string): CursorParams | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');

    const parsed: unknown = JSON.parse(json);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const data = parsed as Record<string, unknown>;

    if (
      typeof data.createdAt !== 'string' ||
      typeof data.id !== 'string' ||
      data.id.trim().length === 0
    ) {
      return null;
    }

    const createdAt = new Date(data.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return {
      createdAt,
      id: data.id,
    };
  } catch {
    return null;
  }
}
