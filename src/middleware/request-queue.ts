import { ServiceUnavailableError } from "./error-handler.ts";
import { logger } from "../utils/logger.ts";

/**
 * Request queue with concurrency limiting
 * Implements semaphore pattern per FR-019, FR-020, FR-021
 */
export class RequestQueue {
  private processing = 0;
  private queue: Array<() => void> = [];

  constructor(
    private maxConcurrent: number,
    private maxQueueSize: number
  ) {}

  /**
   * Process a request with queue management
   */
  async process<T>(fn: () => Promise<T>): Promise<T> {
    // Check if queue is full
    if (this.processing >= this.maxConcurrent && this.queue.length >= this.maxQueueSize) {
      logger.error("Queue capacity exceeded", undefined, {
        processing: this.processing,
        queued: this.queue.length,
        maxConcurrent: this.maxConcurrent,
        maxQueueSize: this.maxQueueSize,
      });
      throw new ServiceUnavailableError(
        "Server at capacity, please try again later",
        {
          queueSize: this.maxQueueSize,
          concurrent: this.maxConcurrent,
        }
      );
    }

    // Wait for available slot if at capacity
    if (this.processing >= this.maxConcurrent) {
      logger.info("Request queued", {
        queued: this.queue.length + 1,
        processing: this.processing,
      });
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    // Process request
    this.processing++;
    logger.debug("Request processing started", {
      processing: this.processing,
      queued: this.queue.length,
    });

    try {
      const result = await fn();
      return result;
    } finally {
      this.processing--;

      // Release next queued request
      const next = this.queue.shift();
      if (next) {
        logger.debug("Releasing queued request", {
          processing: this.processing,
          queued: this.queue.length,
        });
        next();
      }
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      processing: this.processing,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
    };
  }
}
