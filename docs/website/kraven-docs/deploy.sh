#!/bin/bash

# Build the application with the production configuration
echo "Building Kraven UI Documentation with base href /kravenUI/"
npm run build:prod

# Copy index.html to 404.html for GitHub Pages routing
echo "Copying index.html to 404.html for GitHub Pages routing..."
cp dist/kraven-docs/browser/index.html dist/kraven-docs/browser/404.html

# Check if the copy was successful
if [ $? -eq 0 ]; then
  echo "Successfully created 404.html for GitHub Pages routing"
else
  echo "Error: Failed to create 404.html"
  exit 1
fi

# Copy files to the destination directory
echo "Copying files to destination directory..."
rm -rf ../../../../kravenUI/KravenUIWebsite/*
cp -r dist/kraven-docs/browser/* ../../../../kravenUI/KravenUIWebsite

echo "Deployment completed successfully!"
