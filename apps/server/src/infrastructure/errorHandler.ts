import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import type { ErrorResponse } from "@readsync/shared";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { PublicError } from "./errors.js";

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (hasZodFastifySchemaValidationErrors(error)) {
    const message = error.validation.map((issue) => issue.message).join(" ");
    return reply.code(400).send({ error: message } satisfies ErrorResponse);
  }
  if (error instanceof PublicError) {
    return reply.code(error.statusCode).send({ error: error.message } satisfies ErrorResponse);
  }

  request.log.error(error);
  return reply.code(500).send({ error: "Internal server error." } satisfies ErrorResponse);
}
