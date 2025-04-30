#!/bin/bash

# Script to build a fat JAR with all dependencies included

# Ensure JAVA_HOME is set
export JAVA_HOME=$(/usr/libexec/java_home)

echo "Building fat JAR with all dependencies..."

# Clean and package only the necessary modules for the fat JAR
# -pl specifies which modules to build
# -am includes dependencies of the specified modules
# This ensures the example module is not built
mvn clean package -P fat-jar -pl kraven-ui-core,kraven-ui-frontend,kraven-ui-spring-boot-starter

# Check if the build was successful
if [ $? -eq 0 ]; then
    # Find the fat JAR
    FAT_JAR=$(find kraven-ui-spring-boot-starter/target -name "*-with-dependencies.jar" | head -1)

    if [ -n "$FAT_JAR" ]; then
        echo "Successfully built fat JAR:"
        echo "$FAT_JAR"

        # Get the size of the JAR
        SIZE=$(du -h "$FAT_JAR" | cut -f1)
        echo "JAR size: $SIZE"

        # Get the version from the pom.xml
        VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)

        # Create the target directory if it doesn't exist
        mkdir -p target

        # Copy and rename the JAR to kraven-ui-{version}-with-dependencies.jar
        NEW_JAR="target/kraven-ui-${VERSION}-with-dependencies.jar"
        cp "$FAT_JAR" "$NEW_JAR"

        echo "Copied and renamed JAR to: $NEW_JAR"
    else
        echo "Fat JAR not found in the target directory."
        echo "Check if the Maven build completed successfully."
    fi
else
    echo "Build failed. Please check the Maven output for errors."
fi
