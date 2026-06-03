import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Wrap an async route handler so rejected promises hit the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export function notFound(message = "Not found"): HttpError {
  return new HttpError(404, message);
}

export function forbidden(message = "Forbidden"): HttpError {
  return new HttpError(403, message);
}

export function badRequest(message = "Bad request"): HttpError {
  return new HttpError(400, message);
}

/**
 * Read a route param as a single string. Express 5 types params as
 * `string | string[]` (repeatable params); our routes only use single params.
 */
export function param(req: Request, name: string): string {
  const v = (req.params as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}
