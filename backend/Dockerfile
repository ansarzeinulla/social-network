# Build stage
FROM golang:1.25-alpine AS builder

# Install system dependencies for go-sqlite3 (CGO)
RUN apk add --no-cache gcc musl-dev build-base

WORKDIR /app

# Copy go.mod and go.sum
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the code
COPY . .

# Build the application
# CGO_ENABLED=1 is required for go-sqlite3
RUN CGO_ENABLED=1 go build -o main server.go

# Run stage
FROM alpine:latest

RUN apk add --no-cache sqlite sqlite-libs ca-certificates

WORKDIR /app

# Copy the binary from the builder
COPY --from=builder /app/main .
# Copy migrations if they are needed at runtime
COPY --from=builder /app/pkg/db/migrations/sqlite ./pkg/db/migrations/sqlite

# Pre-seed image files into /app/data/uploads. Docker mounts the
# `backend_data` named volume here on first run — when the volume is empty,
# Docker initialises it with whatever the image has at the mount path, so
# these seed images become available alongside the seeded DB rows that
# reference them (000999_seed_dev_data references /uploads/seed-*.svg).
# Existing volume? Files won't be replaced — that's by design; users who
# want fresh seed media should `docker volume rm social-network_backend_data`.
COPY --from=builder /app/seed_uploads /app/data/uploads

EXPOSE 8080

CMD ["./main"]
