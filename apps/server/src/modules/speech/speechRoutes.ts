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
    async (request, reply) => {
      // Drop the ElevenLabs call if the client goes away. This frees the server, but doesn't refund
      // credits: ElevenLabs charges for every character sent, even if the connection closes early.
      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (reply.raw.writableEnded) return;
        request.log.info("Client disconnected; cancelling speech generation");
        controller.abort();
      });
      return speechService.speak(request.body, controller.signal);
    },
  );
};
