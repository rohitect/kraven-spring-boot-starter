#!/bin/bash

# bundle-all.sh
# Script to build and bundle the main project and all plugins
# Collects all output zip files to a common folder at the root

# Exit on error
set -e

# Print script name and description
echo "====================================================="
echo "Kraven UI Bundle Script"
echo "Builds and bundles the main project and all plugins"
echo "====================================================="

# Define output directory for all bundles
OUTPUT_DIR="dist/bundles"

# Clean up existing bundles
cleanup_existing_bundles() {
  echo "Cleaning up existing bundles..."

  # Remove the output directory if it exists
  if [ -d "$OUTPUT_DIR" ]; then
    echo "Removing existing output directory: $OUTPUT_DIR"
    rm -rf "$OUTPUT_DIR"
  fi

  # Create fresh output directory
  mkdir -p "$OUTPUT_DIR"

  # Clean up main project bundles
  echo "Cleaning up main project bundles..."
  if [ -d "./target" ]; then
    find ./target -name "*.zip" -delete
  else
    echo "Target directory doesn't exist yet, will be created during build"
    mkdir -p ./target
  fi

  # Clean up plugin bundles
  echo "Cleaning up plugin bundles..."
  for plugin_dir in plugins/kraven-ui-*-plugin; do
    if [ -d "$plugin_dir" ]; then
      echo "Cleaning up bundles in $plugin_dir"
      if [ -d "$plugin_dir/target" ]; then
        find "$plugin_dir/target" -name "*.zip" -delete
      else
        echo "Target directory doesn't exist yet in $plugin_dir, will be created during build"
        mkdir -p "$plugin_dir/target"
      fi
    fi
  done

  # Clean up dist directories
  if [ -d "dist/maven-bundles" ]; then
    echo "Cleaning up dist/maven-bundles..."
    rm -rf "dist/maven-bundles"
    mkdir -p "dist/maven-bundles"
  fi

  if [ -d "dist/plugins" ]; then
    echo "Cleaning up dist/plugins..."
    rm -rf "dist/plugins"
    mkdir -p "dist/plugins"
  fi

  echo "Cleanup completed."
}

# Get current date for bundle naming
CURRENT_DATE=$(date +"%Y%m%d")

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo "Checking for required tools..."
if ! command_exists mvn; then
  echo "Maven is required but not installed. Please install Maven."
  exit 1
fi

if ! command_exists jar; then
  echo "Java Development Kit (JDK) is required but not installed. Please install JDK."
  exit 1
fi

# Ensure JAVA_HOME is set
if [ -z "$JAVA_HOME" ]; then
  if command_exists /usr/libexec/java_home; then
    export JAVA_HOME=$(/usr/libexec/java_home)
    echo "Set JAVA_HOME to $JAVA_HOME"
  else
    echo "JAVA_HOME is not set and could not be automatically determined."
    echo "Please set JAVA_HOME environment variable."
    exit 1
  fi
fi

# Function to build and bundle the main project
build_main_project() {
  echo ""
  echo "====================================================="
  echo "Building main project..."
  echo "====================================================="

  # Check if build-fat-jar.sh exists and execute it
  if [ -f "./build-fat-jar.sh" ]; then
    echo "Executing build-fat-jar.sh..."
    chmod +x ./build-fat-jar.sh
    ./build-fat-jar.sh
  else
    echo "Building fat JAR manually..."
    mvn clean package -P fat-jar -pl kraven-ui-core,kraven-ui-frontend,kraven-ui-spring-boot-starter
  fi

  # Check if create-central-portal-bundle.sh exists and execute it
  if [ -f "./create-central-portal-bundle.sh" ]; then
    echo "Executing create-central-portal-bundle.sh..."
    chmod +x ./create-central-portal-bundle.sh

    # Create a modified version of the script that skips the prompt
    TMP_SCRIPT="./tmp_create_bundle.sh"
    cp ./create-central-portal-bundle.sh "$TMP_SCRIPT"

    # Remove the prompt section from the script
    sed -i.bak '/Would you like to open the Central Portal upload page now/,/^fi$/d' "$TMP_SCRIPT"

    # Execute the modified script
    chmod +x "$TMP_SCRIPT"
    "$TMP_SCRIPT"

    # Clean up
    rm -f "$TMP_SCRIPT" "$TMP_SCRIPT.bak"
  fi

  # Copy the generated zip files to the output directory
  echo "Copying main project bundles to output directory..."
  if [ -d "./target" ]; then
    find ./target -name "*.zip" -exec cp {} "$OUTPUT_DIR/" \;
  else
    echo "Warning: Target directory doesn't exist after build. Check for build errors."
  fi

  echo "Main project build and bundle completed."
}

# Function to build and bundle the Kafka plugin
build_kafka_plugin() {
  echo ""
  echo "====================================================="
  echo "Building Kafka plugin..."
  echo "====================================================="

  cd plugins/kraven-ui-kafka-plugin

  # Check if bundle-kafka-plugin.sh exists and execute it
  if [ -f "./bundle-kafka-plugin.sh" ]; then
    echo "Executing bundle-kafka-plugin.sh..."
    chmod +x ./bundle-kafka-plugin.sh

    # Create a modified version of the script that skips the prompt
    TMP_SCRIPT="./tmp_bundle_kafka.sh"
    cp ./bundle-kafka-plugin.sh "$TMP_SCRIPT"

    # Remove the prompt section from the script
    sed -i.bak '/Would you like to open the Central Portal upload page now/,/^fi$/d' "$TMP_SCRIPT"

    # Execute the modified script
    chmod +x "$TMP_SCRIPT"
    "$TMP_SCRIPT"

    # Clean up
    rm -f "$TMP_SCRIPT" "$TMP_SCRIPT.bak"
  elif [ -f "./bundle.sh" ]; then
    echo "Executing bundle.sh..."
    chmod +x ./bundle.sh
    ./bundle.sh
  else
    echo "No bundle script found for Kafka plugin. Building manually..."
    mvn clean package
    mvn assembly:single
  fi

  # Copy the generated zip files to the output directory
  echo "Copying Kafka plugin bundles to output directory..."
  if [ -d "./target" ]; then
    find ./target -name "*.zip" -exec cp {} "../../$OUTPUT_DIR/" \;
  else
    echo "Warning: Target directory doesn't exist after build. Check for build errors."
  fi

  cd ../..
  echo "Kafka plugin build and bundle completed."
}

# Function to build and bundle the Mock Server plugin
build_mock_server_plugin() {
  echo ""
  echo "====================================================="
  echo "Building Mock Server plugin..."
  echo "====================================================="

  cd plugins/kraven-ui-mock-server-plugin

  # Check if bundle-mock-server-plugin.sh exists and execute it
  if [ -f "./bundle-mock-server-plugin.sh" ]; then
    echo "Executing bundle-mock-server-plugin.sh..."
    chmod +x ./bundle-mock-server-plugin.sh

    # Create a modified version of the script that skips the prompt
    TMP_SCRIPT="./tmp_bundle_mock_server.sh"
    cp ./bundle-mock-server-plugin.sh "$TMP_SCRIPT"

    # Remove the prompt section from the script
    sed -i.bak '/Would you like to open the Central Portal upload page now/,/^fi$/d' "$TMP_SCRIPT"

    # Execute the modified script
    chmod +x "$TMP_SCRIPT"
    "$TMP_SCRIPT"

    # Clean up
    rm -f "$TMP_SCRIPT" "$TMP_SCRIPT.bak"
  elif [ -f "./bundle.sh" ]; then
    echo "Executing bundle.sh..."
    chmod +x ./bundle.sh
    ./bundle.sh
  else
    echo "No bundle script found for Mock Server plugin. Building manually..."
    mvn clean package
    mvn assembly:single
  fi

  # Copy the generated zip files to the output directory
  echo "Copying Mock Server plugin bundles to output directory..."
  if [ -d "./target" ]; then
    find ./target -name "*.zip" -exec cp {} "../../$OUTPUT_DIR/" \;
  else
    echo "Warning: Target directory doesn't exist after build. Check for build errors."
  fi

  cd ../..
  echo "Mock Server plugin build and bundle completed."
}

# Function to build and bundle the Actuator Insights plugin
build_actuator_insights_plugin() {
  echo ""
  echo "====================================================="
  echo "Building Actuator Insights plugin..."
  echo "====================================================="

  cd plugins/kraven-ui-actuator-insights-plugin

  # Check if bundle.sh exists and execute it
  if [ -f "./bundle.sh" ]; then
    echo "Executing bundle.sh..."
    chmod +x ./bundle.sh
    ./bundle.sh
  else
    echo "No bundle script found for Actuator Insights plugin. Building manually..."
    mvn clean package
    mvn assembly:single
  fi

  # Copy the generated zip files to the output directory
  echo "Copying Actuator Insights plugin bundles to output directory..."
  if [ -d "./target" ]; then
    find ./target -name "*.zip" -exec cp {} "../../$OUTPUT_DIR/" \;
  else
    echo "Warning: Target directory doesn't exist after build. Check for build errors."
  fi

  cd ../..
  echo "Actuator Insights plugin build and bundle completed."
}

# Function to build and bundle the Plugin SDK
build_plugin_sdk() {
  echo ""
  echo "====================================================="
  echo "Building Plugin SDK..."
  echo "====================================================="

  # Check if bundle-plugin-sdk.sh exists in the plugin SDK directory and execute it
  if [ -f "kraven-ui-plugin-sdk/bundle-plugin-sdk.sh" ]; then
    echo "Executing bundle-plugin-sdk.sh..."
    chmod +x kraven-ui-plugin-sdk/bundle-plugin-sdk.sh

    # Create a modified version of the script that skips the prompt
    TMP_SCRIPT="./tmp_bundle_plugin_sdk.sh"
    cp kraven-ui-plugin-sdk/bundle-plugin-sdk.sh "$TMP_SCRIPT"

    # Remove the prompt section from the script if it exists
    sed -i.bak '/Would you like to open the Central Portal upload page now/,/^fi$/d' "$TMP_SCRIPT"

    # Execute the modified script
    chmod +x "$TMP_SCRIPT"
    "$TMP_SCRIPT"

    # Clean up
    rm -f "$TMP_SCRIPT" "$TMP_SCRIPT.bak"
  else
    echo "No bundle script found for Plugin SDK. Building manually..."
    cd kraven-ui-plugin-sdk
    mvn clean package
    cd ..
  fi

  echo "Plugin SDK build and bundle completed."
}

# Function to collect all bundles from dist directories
collect_bundles() {
  echo ""
  echo "====================================================="
  echo "Collecting all bundles..."
  echo "====================================================="

  # Copy any bundles from dist/maven-bundles to the output directory
  if [ -d "dist/maven-bundles" ]; then
    echo "Copying bundles from dist/maven-bundles..."
    find ./dist/maven-bundles -name "*.zip" -exec cp {} "$OUTPUT_DIR/" \;
  fi

  # Copy any bundles from dist/plugins to the output directory
  if [ -d "dist/plugins" ]; then
    echo "Copying bundles from dist/plugins..."
    for plugin_dir in dist/plugins/*; do
      if [ -d "$plugin_dir" ]; then
        plugin_name=$(basename "$plugin_dir")
        echo "Creating zip for $plugin_name plugin..."
        # Create the output directory if it doesn't exist
        mkdir -p "$OUTPUT_DIR"
        # Check if the plugin directory has any files
        if [ "$(ls -A "$plugin_dir")" ]; then
          # Use absolute paths to avoid directory navigation issues
          OUTPUT_DIR_ABS="$(cd "$(dirname "$OUTPUT_DIR")" && pwd)/$(basename "$OUTPUT_DIR")"
          # Create the output directory if it doesn't exist
          mkdir -p "$OUTPUT_DIR_ABS"
          # Check if we can write to the output directory
          if [ -w "$OUTPUT_DIR_ABS" ]; then
            echo "Creating zip file at $OUTPUT_DIR_ABS/kraven-ui-$plugin_name-plugin-bundle-$CURRENT_DATE.zip"
            (cd "$plugin_dir" && zip -r "$OUTPUT_DIR_ABS/kraven-ui-$plugin_name-plugin-bundle-$CURRENT_DATE.zip" .)
          else
            echo "Warning: Cannot write to output directory $OUTPUT_DIR_ABS, skipping zip creation."
          fi
        else
          echo "Warning: Plugin directory $plugin_dir is empty, skipping zip creation."
        fi
      fi
    done
  fi

  echo "All bundles collected in $OUTPUT_DIR"
}

# Main execution
echo "Starting build and bundle process..."

# Clean up existing bundles first
cleanup_existing_bundles

# Build and bundle the main project
build_main_project

# Build and bundle the Plugin SDK
build_plugin_sdk

# Build and bundle the plugins
build_kafka_plugin
build_mock_server_plugin
build_actuator_insights_plugin

# Collect all bundles
collect_bundles

# List all collected bundles
echo ""
echo "====================================================="
echo "Bundle process completed successfully!"
echo "====================================================="
echo "The following bundles were created:"
ls -la "$OUTPUT_DIR"
echo ""
echo "Bundles are available in the $OUTPUT_DIR directory."
