import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import routes from "./routes";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { verifyAllAPIKeys } from "./utils/verify-api-keys";

// Load environment variables
dotenv.config();

// Create Express server
const app = express();

// Set port
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Increase JSON payload size limit for large HTML content
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(loggerMiddleware);

// API Routes
app.use("/api", routes);

// Root route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to SmartBloks HTML Processing API",
    status: "Server is up and running",
    docs: "/api/docs",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: "Route not found",
    status: "error",
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Verify API keys
    console.log("Verifying API keys...");
    const apiKeyStatus = await verifyAllAPIKeys();

    if (!apiKeyStatus.openai) {
      console.warn(
        "WARNING: OpenAI API key is invalid or missing. Image generation will use fallback options."
      );
    }

    if (!apiKeyStatus.anthropic) {
      console.warn(
        "WARNING: Anthropic API key is invalid or missing. Text rewriting will use fallback options."
      );
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`API available at: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
