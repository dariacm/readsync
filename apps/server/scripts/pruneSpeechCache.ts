import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { getConfig } from "../src/infrastructure/config.js";
import { SupabaseSpeechCache } from "../src/modules/speech/SupabaseSpeechCache.js";

// Usage: pnpm --filter @readsync/server cache:prune [--days 30] [--dry-run]
const { values } = parseArgs({
  options: { days: { type: "string", default: "30" }, "dry-run": { type: "boolean", default: false } },
});
const days = Number(values.days);
if (!Number.isInteger(days) || days < 0) {
  console.error(`--days must be a whole number of days, not "${values.days}".`);
  process.exit(1);
}

const { speechCache } = getConfig();
if (!speechCache) {
  console.error("No speech cache configured: set SUPABASE_URL and SUPABASE_SECRET_KEY in apps/server/.env.");
  process.exit(1);
}

const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const client = createClient(speechCache.url, speechCache.secretKey, { auth: { persistSession: false } });
const dryRun = values["dry-run"];
const removed = await new SupabaseSpeechCache(client, speechCache.bucket).prune(cutoff, { dryRun });

const files = `${removed.length} ${removed.length === 1 ? "file" : "files"}`;
console.log(
  dryRun
    ? `Would delete ${files} stored before ${cutoff.toISOString()} (dry run, nothing deleted).`
    : `Deleted ${files} stored before ${cutoff.toISOString()}.`,
);
