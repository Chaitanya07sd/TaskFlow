# ==============================================================================
# Multi-stage Dockerfile for TaskFlow Backend & Static Frontend
# ==============================================================================

# Stage 1: Build stage
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# Copy Maven descriptor and parent folder structure
COPY pom.xml ./pom.xml
# Copy frontend for packaging into static resources
COPY ../frontend ./frontend

# Cache dependencies
RUN mvn dependency:go-offline -B || true

# Copy backend source code
COPY src ./src

# Build production JAR without tests (tests are verified in CI stage)
RUN mvn clean package -DskipTests -B

# ==============================================================================
# Stage 2: Production Runtime Stage
# ==============================================================================
FROM eclipse-temurin:17-jre-jammy

# Metadata
LABEL maintainer="TaskFlow Team"
LABEL description="TaskFlow Full-Stack Task Manager Production Container"
LABEL version="1.0.0"

# Install curl / wget for container health checks
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create secure non-root group and user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Copy compiled JAR from build stage
COPY --from=builder /app/target/taskflow-backend-1.0.0.jar ./app.jar

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose default application port
EXPOSE 8080

# Environment defaults
ENV SERVER_PORT=8080 \
    DB_HOST=localhost \
    DB_PORT=3306 \
    DB_NAME=task_manager_db \
    DB_USERNAME=root \
    DB_PASSWORD="" \
    COOKIE_SECURE=false \
    JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

# Healthcheck monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Start Spring Boot application
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
