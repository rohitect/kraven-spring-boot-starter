#!/bin/bash

# Bundle script for Kraven UI Actuator Insights Plugin
# This script builds the plugin, signs it with GPG, and creates a bundle zip

# Exit on error
set -e

# Print commands
set -x

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script directory
cd "$SCRIPT_DIR"

# Build the plugin
echo "Building Kraven UI Actuator Insights Plugin..."
mvn clean package

# Sign and deploy to Maven local repository
echo "Signing artifacts with GPG and installing to local Maven repository..."
mvn install -P release

# Get the version from the POM file
VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)

# Create a zip bundle with the JAR and README
echo "Creating zip bundle..."
mkdir -p "$SCRIPT_DIR/target/bundle"

# Copy the main JAR
cp "$SCRIPT_DIR/target/kraven-ui-actuator-insights-plugin-$VERSION.jar" "$SCRIPT_DIR/target/bundle/"

# Copy the JAR with dependencies
cp "$SCRIPT_DIR/target/kraven-ui-actuator-insights-plugin-$VERSION-jar-with-dependencies.jar" "$SCRIPT_DIR/target/bundle/"

# Copy the sources JAR
cp "$SCRIPT_DIR/target/kraven-ui-actuator-insights-plugin-$VERSION-sources.jar" "$SCRIPT_DIR/target/bundle/"

# Copy the javadoc JAR
cp "$SCRIPT_DIR/target/kraven-ui-actuator-insights-plugin-$VERSION-javadoc.jar" "$SCRIPT_DIR/target/bundle/"

# Copy the README
cp "$SCRIPT_DIR/README.md" "$SCRIPT_DIR/target/bundle/"

# Copy the POM
cp "$SCRIPT_DIR/pom.xml" "$SCRIPT_DIR/target/bundle/"

# Create a simple installation guide
cat > "$SCRIPT_DIR/target/bundle/INSTALL.txt" << EOF
Kraven UI Actuator Insights Plugin Installation Guide
====================================================

1. Add the JAR to your application's classpath or lib directory.

2. Enable the plugin in your application.yml or application.properties:

   kraven.plugins.actuator-insights.enabled=true

3. Configure the plugin (optional):

   kraven.plugins.actuator-insights.auto-detect=true
   # The base-url and context-path are automatically detected from:
   # - server.port for the port
   # - server.servlet.context-path or spring.mvc.servlet.path for the context path
   # These settings are only used as fallbacks if the Spring Boot properties are not available
   kraven.plugins.actuator-insights.base-url=http://localhost:8080
   kraven.plugins.actuator-insights.context-path=
   kraven.plugins.actuator-insights.data-collection.interval=15s
   kraven.plugins.actuator-insights.data-collection.retention-period=1h
   kraven.plugins.actuator-insights.endpoints.include=*
   kraven.plugins.actuator-insights.endpoints.exclude=heapdump,shutdown
   kraven.plugins.actuator-insights.sensitive-data.mask-sensitive-values=true
   kraven.plugins.actuator-insights.sensitive-data.sensitive-patterns=password,passwd,secret,credential,token,key,auth,private,access

4. Make sure Spring Boot Actuator is enabled in your application:

   management.endpoints.web.exposure.include=*
   management.endpoint.health.show-details=always

   # In Spring Boot 3, all environment property values are masked by default
   # Add this to show the actual values in the Environment tab:
   management.endpoint.env.show-values=always

5. Restart your application and access the Actuator Insights dashboard in Kraven UI.
EOF

# Create the zip file
cd "$SCRIPT_DIR/target/bundle"
zip -r "../kraven-ui-actuator-insights-plugin-$VERSION-bundle.zip" ./*
cd "$SCRIPT_DIR"

# Clean up
rm -rf "$SCRIPT_DIR/target/bundle"

# Print instructions for using the plugin
echo ""
echo "Bundle created at: $SCRIPT_DIR/target/kraven-ui-actuator-insights-plugin-$VERSION-bundle.zip"
echo ""
echo "To use this plugin, add the JAR to your application's classpath."
echo "For example, you can add it as a dependency in your pom.xml:"
echo ""
echo "<dependency>"
echo "    <groupId>io.github.rohitect</groupId>"
echo "    <artifactId>kraven-ui-actuator-insights-plugin</artifactId>"
echo "    <version>$VERSION</version>"
echo "    <scope>runtime</scope>"
echo "</dependency>"
echo ""
echo "Or you can add it to your application's lib directory."
echo ""
echo "Make sure to enable the plugin in your application.yml or application.properties:"
echo ""
echo "kraven.plugins.actuator-insights.enabled=true"
echo ""
echo "And ensure Spring Boot Actuator is enabled in your application:"
echo ""
echo "management.endpoints.web.exposure.include=*"
echo "management.endpoint.health.show-details=always"
echo ""
echo "To display environment property values (which are masked by default in Spring Boot 3):"
echo ""
echo "management.endpoint.env.show-values=always"
echo ""

# Instructions for publishing to Maven Central
echo "To publish to Maven Central, run:"
echo "mvn deploy -P release"
echo ""
