FROM node:20-slim
RUN npm install -g pnpm@10
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile --ignore-scripts
RUN pnpm --filter @workspace/api-zod run --if-present build
RUN pnpm --filter @workspace/api-client-react run --if-present build
RUN pnpm --filter @workspace/warehouse-app run --if-present build
RUN pnpm --filter @workspace/api-server run --if-present build
EXPOSE 3000
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]