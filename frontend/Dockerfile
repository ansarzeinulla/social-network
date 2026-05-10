# Build stage
FROM node:20-alpine AS builder

ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_USE_MOCK_FOLLOWERS=false
ARG NEXT_PUBLIC_USE_MOCK_PROFILE=false
ARG NEXT_PUBLIC_USE_MOCK_NOTIFICATIONS=false
ARG NEXT_PUBLIC_USE_MOCK_COMMENTS=false
ARG NEXT_PUBLIC_USE_MOCK_CHAT=false
ARG NEXT_PUBLIC_USE_MOCK_GROUPS=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_USE_MOCK_FOLLOWERS=$NEXT_PUBLIC_USE_MOCK_FOLLOWERS
ENV NEXT_PUBLIC_USE_MOCK_PROFILE=$NEXT_PUBLIC_USE_MOCK_PROFILE
ENV NEXT_PUBLIC_USE_MOCK_NOTIFICATIONS=$NEXT_PUBLIC_USE_MOCK_NOTIFICATIONS
ENV NEXT_PUBLIC_USE_MOCK_COMMENTS=$NEXT_PUBLIC_USE_MOCK_COMMENTS
ENV NEXT_PUBLIC_USE_MOCK_CHAT=$NEXT_PUBLIC_USE_MOCK_CHAT
ENV NEXT_PUBLIC_USE_MOCK_GROUPS=$NEXT_PUBLIC_USE_MOCK_GROUPS

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the code
COPY . .

# Build the Next.js app
RUN npm run build

# Run stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=http://localhost:8080

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
