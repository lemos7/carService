FROM node:24.19.0-bookworm-slim

WORKDIR /app
ENV EXPO_NO_TELEMETRY=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 8081
# Refresh the isolated Linux dependencies after lockfile changes.
CMD ["sh", "-c", "npm ci && exec npm run start:docker"]
