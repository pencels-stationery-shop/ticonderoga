FROM node:18-slim

WORKDIR /usr/src/app
COPY . .

RUN npm install
RUN npm run build

ENV NODE_ENV=production
CMD [ "npm" , "start" ]