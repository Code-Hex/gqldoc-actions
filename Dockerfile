FROM node:slim

COPY . .

RUN npm ci

ENTRYPOINT ["node", "/lib/main.js"]