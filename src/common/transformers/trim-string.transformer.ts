import type { TransformFnParams } from 'class-transformer';

export const trimStringTransformer = ({
  value,
}: TransformFnParams): unknown => {
  const input: unknown = value;

  return typeof input === 'string' ? input.trim() : input;
};
