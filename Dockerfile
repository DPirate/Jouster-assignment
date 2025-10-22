FROM denoland/deno:1.40.0

# Set working directory
WORKDIR /app

# Copy dependency files
COPY deno.json .

# Copy source code
COPY src/ ./src/

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "src/main.ts"]
