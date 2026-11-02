import type { DemoResponse, ErrorResponse } from "@readsync/shared";
import Fastify, { type FastifyServerOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { errorHandler } from "./infrastructure/errorHandler.js";
import type { SpeechService } from "./modules/speech/SpeechService.js";
import { speechRoutes } from "./modules/speech/speechRoutes.js";

export interface AppDependencies {
  speechService: SpeechService;
  /** Set in demo mode: the only text the recorded fixture can read. */
  demoText?: string;
}

export async function buildApp(deps: AppDependencies, options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  app.get("/api/health", async () => ({ ok: true }));
  app.get("/api/demo", async (_request, reply) => {
    if (deps.demoText === undefined) return reply.code(404).send({ error: "Not in demo mode." } satisfies ErrorResponse);
    return { text: deps.demoText } satisfies DemoResponse;
  });
  await app.register(speechRoutes, { speechService: deps.speechService });

  return app;
}
