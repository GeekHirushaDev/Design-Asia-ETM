# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Create necessary directories and set permissions
RUN mkdir -p /app/uploads /app/logs
RUN chown -R nextjs:nodejs /app/uploads /app/logs

# Switch to the non-root user
USER nextjs

# Expose the port that the app runs on
EXPOSE 5000

# Define environment variable
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"]
