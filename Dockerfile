FROM ruby:3.2-slim

WORKDIR /app

RUN gem install webrick --no-document

COPY . .

RUN mkdir -p /app/data/uploads /app/backups

ENV PORT=3000
EXPOSE 3000

CMD ["ruby", "server.rb"]
