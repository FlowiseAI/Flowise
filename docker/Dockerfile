# @knighttower - https://knighttower.io

# Use Node.js official base image
FROM node:20.2.0-slim

ARG DOCKER_WORKSPACE_DIR

# Set environment variables
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR $DOCKER_WORKSPACE_DIR

# Install necessary packages to extend the dev environment and allow other integrations or manipulations
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    python3 \
    python3-pip \
    make \
    g++ \
    git \
    libcairo2-dev \
    libpango1.0-dev \
    chromium \
    bash \
    wget \
    nano \
    gcc \
    zip \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Ensure .bashrc exists for root and is executable
RUN touch ~/.bashrc && chmod +x ~/.bashrc
SHELL ["/bin/bash", "--login", "-c"]

# Expose port 3000
EXPOSE 3000
