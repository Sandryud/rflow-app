import {
  decodeAuditCursor,
  encodeAuditCursor,
} from '@modules/audit/audit.cursor';

const cursorData = {
  id: 'event-id',
  createdAt: new Date('2026-07-26T10:00:00.000Z'),
};

const encodePayload = (payload: unknown) =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

describe('audit cursor', () => {
  describe('encodeAuditCursor', () => {
    it('encodes the event id and ISO creation date', () => {
      const cursor = encodeAuditCursor(cursorData);
      const json = Buffer.from(cursor, 'base64url').toString('utf8');
      const decoded: unknown = JSON.parse(json);

      expect(decoded).toEqual({
        id: cursorData.id,
        createdAt: cursorData.createdAt.toISOString(),
      });
    });

    it('preserves cursor data through encoding and decoding', () => {
      const cursor = encodeAuditCursor(cursorData);

      const decoded = decodeAuditCursor(cursor);

      expect(decoded).toEqual(cursorData);
    });
  });

  describe('decodeAuditCursor', () => {
    it('decodes a valid audit cursor', () => {
      const cursor = encodePayload({
        id: cursorData.id,
        createdAt: cursorData.createdAt.toISOString(),
      });

      const decoded = decodeAuditCursor(cursor);

      expect(decoded).toEqual(cursorData);
    });

    it.each([
      { caseName: 'null', payload: null },
      { caseName: 'a primitive string', payload: 'value' },
      { caseName: 'a number', payload: 123 },
      { caseName: 'an array', payload: [] },
      {
        caseName: 'an object without createdAt',
        payload: { id: cursorData.id },
      },
      {
        caseName: 'an object with non-string createdAt',
        payload: { id: cursorData.id, createdAt: 123 },
      },
      {
        caseName: 'an object with an invalid date',
        payload: { id: cursorData.id, createdAt: 'not-a-date' },
      },
      {
        caseName: 'an object without id',
        payload: { createdAt: cursorData.createdAt.toISOString() },
      },
      {
        caseName: 'an object with non-string id',
        payload: {
          id: 123,
          createdAt: cursorData.createdAt.toISOString(),
        },
      },
      {
        caseName: 'an object with an empty id',
        payload: {
          id: '',
          createdAt: cursorData.createdAt.toISOString(),
        },
      },
      {
        caseName: 'an object with a whitespace-only id',
        payload: {
          id: '   ',
          createdAt: cursorData.createdAt.toISOString(),
        },
      },
    ])('returns null when the decoded payload is $caseName', ({ payload }) => {
      const cursor = encodePayload(payload);

      const decoded = decodeAuditCursor(cursor);

      expect(decoded).toBeNull();
    });

    it('returns null when the cursor contains malformed JSON', () => {
      const cursor = Buffer.from('{invalid-json', 'utf8').toString('base64url');

      const decoded = decodeAuditCursor(cursor);

      expect(decoded).toBeNull();
    });

    it('returns null when the cursor is empty', () => {
      const decoded = decodeAuditCursor('');

      expect(decoded).toBeNull();
    });
  });
});
