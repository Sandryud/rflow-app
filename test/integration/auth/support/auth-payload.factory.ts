export const validRegisterPayload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
};

export const validLoginPayload = {
  email: 'jane@example.com',
  password: 'password123',
};

export const buildRegisterPayload = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ...validRegisterPayload,
  ...overrides,
});

export const buildLoginPayload = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ...validLoginPayload,
  ...overrides,
});
