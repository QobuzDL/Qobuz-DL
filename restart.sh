#!/bin/bash

# Stop any running server
echo "Stopping server..."

# Remove .next cache
echo "Removing .next cache..."
rm -rf .next

# Remove old config
echo "Removing old config..."
rm -f next.config.ts

# Restart server
echo "Starting server..."
npm run dev
