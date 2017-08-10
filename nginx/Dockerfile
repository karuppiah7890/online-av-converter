FROM nginx:alpine

WORKDIR /code/

COPY ./frontend /code/frontend

RUN mkdir -p /code/backend/downloads/

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]