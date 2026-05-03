# Use the official Node.js image
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend and backend
RUN npm run build

# Expose the port the app runs on (Cloud Run provides PORT environment variable)
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"]
