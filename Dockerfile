# --- Build stage: install all deps and build the SvelteKit app ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# Drop devDependencies so we copy a lean node_modules into the runtime image.
RUN npm prune --omit=dev

# --- Runtime stage ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
# Apply migrations, then start the adapter-node server (listens on $PORT).
CMD ["sh", "-c", "node scripts/migrate.mjs && node build"]
