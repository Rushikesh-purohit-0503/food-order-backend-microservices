FROM node:18-alpine

WORKDIR /app

COPY services/notification-service/package.json ./package.json
RUN npm install

COPY services/notification-service/ .
COPY shared ./shared

CMD ["node", "index.js"]
