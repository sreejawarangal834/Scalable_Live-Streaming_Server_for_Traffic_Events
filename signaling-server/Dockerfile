FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server-analytics.js .
COPY system-monitor.js .

EXPOSE 3000 3001

CMD ["npm", "start"]
