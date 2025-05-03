#!/bin/bash

# Bundle script for Kraven UI Kafka Plugin
# This script builds the plugin and creates a fat JAR with all dependencies

# Exit on error
set -e

# Print commands
set -x

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script directory
cd "$SCRIPT_DIR"

# Build the plugin
echo "Building Kraven UI Kafka Plugin..."
mvn clean package

# Create the fat JAR
echo "Creating fat JAR with dependencies..."
mvn assembly:single

# Get the version from the POM file
VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)

# Print the location of the fat JAR
echo "Fat JAR created at: $SCRIPT_DIR/target/kraven-ui-kafka-plugin-$VERSION-jar-with-dependencies.jar"

# Print instructions for using the plugin
echo ""
echo "To use this plugin, add the JAR to your application's classpath."
echo "For example, you can add it as a dependency in your pom.xml:"
echo ""
echo "<dependency>"
echo "    <groupId>io.github.rohitect</groupId>"
echo "    <artifactId>kraven-ui-kafka-plugin</artifactId>"
echo "    <version>$VERSION</version>"
echo "    <scope>runtime</scope>"
echo "</dependency>"
echo ""
echo "Or you can add it to your application's lib directory."
echo ""
echo "Make sure to enable the plugin in your application.yml or application.properties:"
echo ""
echo "kraven.plugins.kafka.enabled=true"
echo ""
