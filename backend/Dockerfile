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

RUN apk add --no-cache sqlite-libs ca-certificates

WORKDIR /app

# Copy the binary from the builder
COPY --from=builder /app/main .
# Copy migrations if they are needed at runtime
COPY --from=builder /app/pkg/db/migrations/sqlite ./pkg/db/migrations/sqlite

EXPOSE 8080

CMD ["./main"]
