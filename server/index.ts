import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let server: any;
  try {
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    log("Database connection successful");

    log("Starting server initialization...");

    const PORT = 5000;
    let retries = 5;

    while (retries > 0) {
      try {
        server = registerRoutes(app);

        // Global error handler
        app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
          const status = err.status || err.statusCode || 500;
          const message = err.message || "Internal Server Error";
          log(`Error: ${message}`);
          res.status(status).json({ message });
          console.error('Server error:', err);
        });

        // Setup Vite or static files based on environment
        if (app.get("env") === "development") {
          log("Setting up Vite development server...");
          await setupVite(app, server);
          log("Vite development server setup complete");
        } else {
          log("Setting up static file serving...");
          serveStatic(app);
          log("Static file serving setup complete");
        }

        await new Promise<void>((resolve, reject) => {
          server.listen(PORT, "0.0.0.0", () => {
            log(`Server running on http://0.0.0.0:${PORT}`);
            resolve();
          }).on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${PORT} is in use, retrying...`);
              reject(err);
            } else {
              log(`Failed to start server: ${err.message}`);
              reject(err);
            }
          });
        });

        // If we get here, the server started successfully
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          throw err;
        }
        // Wait a second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Handle cleanup
    const cleanup = () => {
      log('Starting server shutdown...');
      if (server) {
        server.close(() => {
          log('Server shutdown complete');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();