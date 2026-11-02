import Fastify, { type FastifyServerOptions } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { errorHandler } from "./infrastructure/errorHandler.js";
import type { SpeechService } from "./modules/speech/SpeechService.js";
import { speechRoutes } from "./modules/speech/speechRoutes.js";

export interface AppDependencies {
  speechService: SpeechService;
}

export async function buildApp(deps: AppDependencies, options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  app.get("/api/health", async () => ({ ok: true }));
  await app.register(speechRoutes, { speechService: deps.speechService });

  return app;
}
