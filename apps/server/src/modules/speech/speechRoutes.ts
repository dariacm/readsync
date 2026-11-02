import { errorResponseSchema, speakRequestSchema, speakResponseSchema } from "@readsync/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { SpeechService } from "./SpeechService.js";

export const speechRoutes: FastifyPluginAsyncZod<{ speechService: SpeechService }> = async (app, { speechService }) => {
  app.post(
    "/api/speak",
    {
      schema: {
        body: speakRequestSchema,
        response: { 200: speakResponseSchema, "4xx": errorResponseSchema, "5xx": errorResponseSchema },
      },
    },
    async (request) => speechService.speak(request.body.text, request.body.voiceId),
  );
};
