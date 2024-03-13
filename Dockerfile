FROM node:18-alpine

MAINTAINER Sergio Rodríguez <sergio.rdzsg@gmail.com>

ADD . /burbujas
WORKDIR /burbujas

RUN npm i -g serve 

EXPOSE 5000

CMD ["serve", "-s", "/burbujas", "-l", "5000"]
