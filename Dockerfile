FROM karuppiah7890/ffmpeg-and-node:latest

WORKDIR /code/

COPY package.json .

COPY yarn.lock .

RUN yarn

COPY . .

EXPOSE 8080

CMD [ "npm" , "start" ]