FROM karuppiah7890/ffmpeg-and-node:latest

WORKDIR /code/

RUN apk --no-cache add make gcc libgcc g++ libgc++ python

COPY package.json .

COPY yarn.lock .

RUN yarn install

COPY . .

RUN mkdir -p /code/backend/uploads

RUN mkdir -p /code/backend/downloads

EXPOSE 8080

CMD [ "npm" , "start" ]