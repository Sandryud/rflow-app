const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export const toPublicUser = ({ id, name, email }: PublicUser): PublicUser => ({
  id,
  name,
  email,
});

export const expectHttpErrorResponse = (
  response: { body: Record<string, unknown> },
  expected: {
    statusCode: number;
    message: unknown;
    error: string;
    path: string;
  },
): void => {
  expect(response.body).toMatchObject(expected);
  expect(response.body.timestamp).toEqual(
    expect.stringMatching(ISO_TIMESTAMP_PATTERN),
  );
};
