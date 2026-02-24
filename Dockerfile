# Build frontend
FROM node:20-alpine AS frontend
# Optional: pass --build-arg VITE_COACH_PIN=yourpin to override default coach PIN
ARG VITE_COACH_PIN
ENV VITE_COACH_PIN=${VITE_COACH_PIN}
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime: serve API + static frontend
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=frontend /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/server.js"]
