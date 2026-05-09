import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/app";
import { seedDatabase } from "../server/seedData";
import { runMigrations } from "../server/migrations";

// Singleton — initialized once per cold start, reused across warm invocations.
let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      // Best-effort init: don't crash the function if seeding fails (the table
      // may already be populated from a previous deploy).
      try {
        await seedDatabase();
        await runMigrations();
      } catch (err) {
        console.error("[vercel] init warning:", err);
      }
      const { app } = await createApp();
      return app;
    })();
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  return app(req, res);
}
