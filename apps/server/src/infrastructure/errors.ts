/** An error whose message is safe to show to API clients. */
export class PublicError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PublicError";
  }
}
