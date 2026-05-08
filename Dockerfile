FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY server/client/package.json ./
RUN npm install
COPY server/client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/src/ ./src/
COPY --from=frontend-builder /app/dist ./client/dist

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
