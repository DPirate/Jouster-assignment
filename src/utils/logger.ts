/**
 * Log levels
 */
export type LogLevel = "info" | "error" | "debug";

/**
 * Structured logger for JSON output
 */
export class Logger {
  constructor(private level: LogLevel = "info") {}

  /**
   * Log info message to stdout
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  /**
   * Log error message to stderr
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    const errorData = error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : undefined;

    this.log("error", message, { ...metadata, error: errorData }, true);
  }

  /**
   * Log debug message to stdout
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    if (this.level === "debug") {
      this.log("debug", message, metadata);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    useStderr = false
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    const output = JSON.stringify(logEntry) + "\n";

    if (useStderr) {
      Deno.stderr.writeSync(new TextEncoder().encode(output));
    } else {
      Deno.stdout.writeSync(new TextEncoder().encode(output));
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger(
  (Deno.env.get("LOG_LEVEL") as LogLevel) || "info"
);
