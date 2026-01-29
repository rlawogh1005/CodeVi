# 1. Build Stage
FROM node:20 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Production Stage
FROM node:20-alpine
WORKDIR /usr/src/app

# 실행에 필요한 최소 파일만 복사
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# 포트를 3000으로 통일 (혹은 main.ts 설정에 맞춤)
EXPOSE 13000
ENV NODE_ENV=production

CMD ["node", "dist/main"]