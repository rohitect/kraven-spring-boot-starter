#!/bin/bash

# Set JAVA_HOME if it's not already set
if [ -z "$JAVA_HOME" ]; then
    # Try to find Java on macOS
    if [ -x "/usr/libexec/java_home" ]; then
        export JAVA_HOME=$(/usr/libexec/java_home)
        echo "Set JAVA_HOME to $JAVA_HOME"
    # Try to find Java 21 in Homebrew installation
    elif [ -d "/opt/homebrew/Cellar/openjdk@21" ]; then
        # Find the latest version of Java 21
        JAVA21_PATH=$(find /opt/homebrew/Cellar/openjdk@21 -name "openjdk.jdk" -type d | head -1)
        if [ -n "$JAVA21_PATH" ]; then
            export JAVA_HOME="$JAVA21_PATH/Contents/Home"
            echo "Set JAVA_HOME to $JAVA_HOME"
        fi
    # Try common locations on Linux
    elif [ -d "/usr/lib/jvm/java-17-openjdk" ]; then
        export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
        echo "Set JAVA_HOME to $JAVA_HOME"
    elif [ -d "/usr/lib/jvm/java-11-openjdk" ]; then
        export JAVA_HOME="/usr/lib/jvm/java-11-openjdk"
        echo "Set JAVA_HOME to $JAVA_HOME"
    else
        echo "Warning: JAVA_HOME is not set and could not be auto-detected."
        echo "You may need to set it manually if Maven commands fail."
    fi
fi

# Determine which Maven executable to use
if [ -x "./mvnw" ]; then
    MVN_CMD="./mvnw"
    echo "Using Maven wrapper: $MVN_CMD"
elif [ -x "/Users/rohit.ranjan/work/iS/apache-maven-3.8.3/bin/mvn" ]; then
    MVN_CMD="/Users/rohit.ranjan/work/iS/apache-maven-3.8.3/bin/mvn"
    echo "Using Maven: $MVN_CMD"
elif command -v mvn >/dev/null 2>&1; then
    MVN_CMD="mvn"
    echo "Using Maven from PATH: $MVN_CMD"
else
    echo "Error: Maven executable not found. Please install Maven or add it to your PATH."
    exit 1
fi

# Function to display usage information
show_usage() {
    echo "Usage: $0 [patch|minor|major|<specific-version>]"
    echo ""
    echo "Arguments:"
    echo "  patch               Increment the patch version (e.g., 1.2.3 -> 1.2.4)"
    echo "  minor               Increment the minor version (e.g., 1.2.3 -> 1.3.0)"
    echo "  major               Increment the major version (e.g., 1.2.3 -> 2.0.0)"
    echo "  <specific-version>  Set a specific version (e.g., 2.0.0-SNAPSHOT)"
    echo ""
    echo "Examples:"
    echo "  $0 patch            # Update from 1.2.3-SNAPSHOT to 1.2.4-SNAPSHOT"
    echo "  $0 minor            # Update from 1.2.3-SNAPSHOT to 1.3.0-SNAPSHOT"
    echo "  $0 major            # Update from 1.2.3-SNAPSHOT to 2.0.0-SNAPSHOT"
    echo "  $0 1.5.0-SNAPSHOT   # Set version to 1.5.0-SNAPSHOT"
    exit 1
}

# Check if an argument was provided
if [ $# -ne 1 ]; then
    show_usage
fi

# Get the current version from the parent POM
echo "Retrieving current version from POM..."
CURRENT_VERSION=$($MVN_CMD help:evaluate -Dexpression=project.version -q -DforceStdout 2>/dev/null)

# If Maven command failed, try to extract version directly from pom.xml
if [ -z "$CURRENT_VERSION" ] || [[ $CURRENT_VERSION == *"ERROR"* ]]; then
    echo "Maven command failed, trying to extract version from pom.xml..."
    # Use grep and sed to extract version from pom.xml
    CURRENT_VERSION=$(grep -m 1 "<version>.*</version>" pom.xml | sed -E 's/.*<version>(.*)<\/version>.*/\1/')

    if [ -z "$CURRENT_VERSION" ]; then
        echo "Error: Could not determine current version. Please check your pom.xml file."
        exit 1
    fi
fi

echo "Current version: $CURRENT_VERSION"

# Function to calculate the new version based on the update type
calculate_new_version() {
    local current_version=$1
    local update_type=$2

    # Extract version components
    if [[ $current_version =~ ([0-9]+)\.([0-9]+)\.([0-9]+)(.*) ]]; then
        local major=${BASH_REMATCH[1]}
        local minor=${BASH_REMATCH[2]}
        local patch=${BASH_REMATCH[3]}
        local suffix=${BASH_REMATCH[4]}

        case $update_type in
            patch)
                patch=$((patch + 1))
                ;;
            minor)
                minor=$((minor + 1))
                patch=0
                ;;
            major)
                major=$((major + 1))
                minor=0
                patch=0
                ;;
            *)
                echo "Invalid update type: $update_type"
                exit 1
                ;;
        esac

        echo "$major.$minor.$patch$suffix"
    else
        echo "Error: Could not parse version number: $current_version"
        exit 1
    fi
}

# Determine the new version
if [[ "$1" == "patch" || "$1" == "minor" || "$1" == "major" ]]; then
    NEW_VERSION=$(calculate_new_version "$CURRENT_VERSION" "$1")
else
    NEW_VERSION=$1
fi

echo "Updating project version to $NEW_VERSION"

# Update the version in the parent POM
echo "Running Maven to update version in POMs..."

# Update version using Maven
$MVN_CMD versions:set -DnewVersion=$NEW_VERSION -DgenerateBackupPoms=false

# Check if Maven command was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to update version in POMs. Please check your Maven installation."
    exit 1
fi

# No need to update kraven.ui.version property as it's now read from project.version

# Update the package.json version in the frontend module
echo "Updating version in package.json..."
if [ -d "kraven-ui-frontend" ] && [ -f "kraven-ui-frontend/package.json" ]; then
    cd kraven-ui-frontend
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
    if [ $? -ne 0 ]; then
        echo "Warning: Failed to update version in package.json"
    fi
    cd ..
else
    echo "Warning: Could not find kraven-ui-frontend/package.json"
fi

# Update the version in KravenUiProperties.java
echo "Updating version in KravenUiProperties.java..."
KRAVEN_UI_PROPS="kraven-ui-spring-boot-starter/src/main/java/io/github/rohitect/kraven/springboot/KravenUiProperties.java"
if [ -f "$KRAVEN_UI_PROPS" ]; then
    sed -i '' "s/private String version = \".*\";/private String version = \"$NEW_VERSION\";/" "$KRAVEN_UI_PROPS"
    if [ $? -ne 0 ]; then
        echo "Warning: Failed to update version in KravenUiProperties.java"
    fi
else
    echo "Warning: Could not find $KRAVEN_UI_PROPS"
fi

# Update the version in README.md
echo "Updating version in README.md..."
if [ -f "README.md" ]; then
    # Update the first instance of kraven-ui-spring-boot-starter version (around line 53)
    line_num1=$(grep -n "<artifactId>kraven-ui-spring-boot-starter</artifactId>" README.md | head -1 | cut -d ':' -f 1)
    if [ -n "$line_num1" ]; then
        version_line=$((line_num1 + 1))
        sed -i '' "${version_line}s/<version>[^<]*<\/version>/<version>$NEW_VERSION<\/version>/" README.md
    fi

    # Update the second instance of kraven-ui-spring-boot-starter version (around line 146)
    line_num2=$(grep -n "<!-- Kraven UI -->" README.md | head -1 | cut -d ':' -f 1)
    if [ -n "$line_num2" ]; then
        # Find the version line within the next 5 lines
        version_line=$(tail -n +$line_num2 README.md | grep -n "<version>" | head -1 | cut -d ':' -f 1)
        if [ -n "$version_line" ]; then
            actual_line=$((line_num2 + version_line - 1))
            sed -i '' "${actual_line}s/<version>[^<]*<\/version>/<version>$NEW_VERSION<\/version>/" README.md
        fi
    fi

    # Verify that at least one version was updated
    if ! grep -q "<version>$NEW_VERSION</version>" README.md; then
        echo "Warning: No version tags were updated in README.md."
    else
        echo "Successfully updated version in README.md"
    fi
else
    echo "Warning: Could not find README.md"
fi

echo "Version updated successfully to $NEW_VERSION"
echo "Changes made:"
echo "1. Updated <version> tags in all POMs"
echo "2. Updated version in package.json"
echo "3. Updated version in KravenUiProperties.java"
echo "4. Updated version in README.md"
