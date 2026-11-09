export type ErrorCode = 'validation' | 'not-found' | 'conflict' | 'persistence' | 'simulated';
export class LocalDataError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;
  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'LocalDataError';
    this.code = code;
    this.cause = cause;
  }
}
export function persistenceError(error: unknown): LocalDataError {
  return error instanceof LocalDataError ? error
    : new LocalDataError('persistence', 'Não foi possível acessar os dados locais. Tente novamente.', error);
}
