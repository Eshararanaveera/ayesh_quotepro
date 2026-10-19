/** Error with an HTTP status, turned into a JSON response by the error handler. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: Record<string, string>) => new HttpError(400, message, details);
export const unauthorized = (message = 'Please sign in') => new HttpError(401, message);
export const forbidden = (message = 'You do not have permission to do this') => new HttpError(403, message);
export const notFound = (what = 'Record') => new HttpError(404, `${what} not found`);
export const conflict = (message: string) => new HttpError(409, message);
