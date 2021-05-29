FROM node:fermium

# Create workdir
RUN mkdir -p /data
WORKDIR /data

# Set production env
ENV NODE_ENV=production

# Install server
RUN npm install -g dudes-server

# De-escalate privileges
USER node

# Start server
CMD [ "dudes-server", "./config.json" ]
