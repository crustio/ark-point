FROM node:current-alpine3.10

# Create crust-smanager directory
WORKDIR /usr/src/ark-backend

# Move source files to docker image
COPY . .

# Install dependencies
RUN yarn && yarn build

# Run
ENTRYPOINT yarn start $ARGS