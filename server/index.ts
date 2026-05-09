import { createApp } from "./app";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seedData";
import { runMigrations } from "./migrations";

(async () => {
  // Seed & migrate (Replit-managed Postgres)
  await seedDatabase();
  await runMigrations();

  const { app, server } = await createApp();

  // Dev: Vite middleware. Prod (on Replit): serve built static files.
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => log(`serving on port ${port}`),
  );
})();
