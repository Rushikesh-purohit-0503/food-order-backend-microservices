FROM node:18-alpine

WORKDIR /app

COPY services/auth-service/package.json ./package.json
RUN npm install

COPY services/auth-service/ .
COPY shared ./shared

CMD ["node", "index.js"]
