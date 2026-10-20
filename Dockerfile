FROM ruby:3.2-slim

WORKDIR /app

COPY Gemfile ./
RUN bundle install

COPY . .

RUN mkdir -p /app/data/uploads /app/backups

ENV PORT=3000
EXPOSE 3000

CMD ["bundle", "exec", "ruby", "server.rb"]
