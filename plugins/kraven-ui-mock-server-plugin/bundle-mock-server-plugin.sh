#!/bin/bash

# Script to build and bundle the Mock Server plugin for Maven Central deployment

set -e

# Ensure JAVA_HOME is set
export JAVA_HOME=$(/usr/libexec/java_home)

# Define properties file path (relative to project root)
PROPERTIES_FILE="../../maven-deploy.properties"

# Check if GPG is installed
if ! command -v gpg &> /dev/null; then
    echo "GPG is not installed. Please install it first."
    exit 1
fi

# Check if GPG key exists
if ! gpg --list-secret-keys | grep -q "sec"; then
    echo "No GPG key found. Please generate a GPG key first."
    echo "Run: gpg --gen-key"
    exit 1
fi

# Check if properties file exists
if [ ! -f "$PROPERTIES_FILE" ]; then
    echo "Properties file $PROPERTIES_FILE not found."
    echo "Using default GPG configuration."
    GPG_PASSPHRASE=""
else
    # Function to read a property from the properties file
    function get_property {
        grep "^$1=" "$PROPERTIES_FILE" | cut -d'=' -f2-
    }

    # Read GPG passphrase
    GPG_PASSPHRASE=$(get_property "gpg.passphrase")

    if [ -n "$GPG_PASSPHRASE" ] && [ "$GPG_PASSPHRASE" != "YOUR_GPG_PASSPHRASE" ]; then
        echo "Using GPG passphrase from properties file."
    else
        echo "No valid GPG passphrase found in properties file."
        echo "You may be prompted for your GPG passphrase during signing."
        GPG_PASSPHRASE=""
    fi

    # Export GPG TTY for passphrase prompting if needed
    export GPG_TTY=$(tty)
fi

# Get version from pom.xml
VERSION=$(grep -m 1 "<version>" pom.xml | sed -e 's/<version>\(.*\)<\/version>/\1/' | xargs)
echo "Building Mock Server plugin bundle version: $VERSION"

# Build the plugin
echo "Building Mock Server Plugin..."
mvn clean package -DskipTests

# Navigate to project root
cd ../..

# Create bundle directories
echo "Creating plugin bundle directories..."
BUNDLE_DIR="dist/plugins/mock-server"
MAVEN_BUNDLE_DIR="dist/maven-bundles"
mkdir -p $BUNDLE_DIR
mkdir -p $MAVEN_BUNDLE_DIR

# Copy plugin JAR to bundle directory
echo "Copying Mock Server plugin JAR to bundle directory..."
cp plugins/kraven-ui-mock-server-plugin/target/kraven-ui-mock-server-plugin-*-jar-with-dependencies.jar $BUNDLE_DIR/

# Create Maven bundle structure
echo "Creating Maven bundle structure..."
MAVEN_BUNDLE_TMP="dist/tmp-maven-bundle"
rm -rf $MAVEN_BUNDLE_TMP
mkdir -p $MAVEN_BUNDLE_TMP

# Define artifact base name and paths
ARTIFACT_BASE="kraven-ui-mock-server-plugin"
GROUP_ID="io.github.rohitect"
ARTIFACT_ID="$ARTIFACT_BASE"
GROUP_PATH=$(echo "$GROUP_ID" | tr '.' '/')

# Create the proper Maven bundle directory structure
mkdir -p "$MAVEN_BUNDLE_TMP/$GROUP_PATH/$ARTIFACT_ID/$VERSION"

# Copy the plugin JAR to the Maven bundle structure
cp plugins/kraven-ui-mock-server-plugin/target/kraven-ui-mock-server-plugin-*-jar-with-dependencies.jar \
   $MAVEN_BUNDLE_TMP/$GROUP_PATH/$ARTIFACT_ID/$VERSION/$ARTIFACT_ID-$VERSION.jar

# Copy POM file
cp plugins/kraven-ui-mock-server-plugin/pom.xml \
   $MAVEN_BUNDLE_TMP/$GROUP_PATH/$ARTIFACT_ID/$VERSION/$ARTIFACT_ID-$VERSION.pom

# Create empty javadoc JAR
echo "Creating empty javadoc JAR..."
TEMP_DIR="dist/temp-javadoc"
mkdir -p "$TEMP_DIR"
touch "$TEMP_DIR/README.txt"
echo "This is the Mock Server plugin for Kraven UI.\n\nFor documentation, please visit: https://github.com/rohitect/kraven\n\nVersion: $VERSION" > "$TEMP_DIR/README.txt"
jar -cf "$MAVEN_BUNDLE_TMP/$GROUP_PATH/$ARTIFACT_ID/$VERSION/$ARTIFACT_ID-$VERSION-javadoc.jar" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

# Create empty sources JAR
echo "Creating empty sources JAR..."
TEMP_DIR="dist/temp-sources"
mkdir -p "$TEMP_DIR"
touch "$TEMP_DIR/README.txt"
echo "This is the Mock Server plugin for Kraven UI.\n\nFor source code, please visit: https://github.com/rohitect/kraven\n\nVersion: $VERSION" > "$TEMP_DIR/README.txt"
jar -cf "$MAVEN_BUNDLE_TMP/$GROUP_PATH/$ARTIFACT_ID/$VERSION/$ARTIFACT_ID-$VERSION-sources.jar" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

# Generate checksums
echo "Generating checksums..."
cd "$MAVEN_BUNDLE_TMP/$GROUP_PATH/$ARTIFACT_ID/$VERSION"
for file in *.jar *.pom; do
    if [[ -f "$file" ]]; then
        echo "Generating checksums for $file..."
        # Generate MD5 checksum
        md5sum "$file" | cut -d' ' -f1 > "$file.md5"

        # Generate SHA1 checksum
        shasum -a 1 "$file" | cut -d' ' -f1 > "$file.sha1"
    fi
done
cd - > /dev/null

# Sign all the artifacts
echo "Signing artifacts..."
cd "$MAVEN_BUNDLE_TMP/$GROUP_PATH/$ARTIFACT_ID/$VERSION"
for file in *.jar *.pom; do
    if [[ -f "$file" ]]; then
        echo "Signing $file..."
        if [ -n "$GPG_PASSPHRASE" ]; then
            echo "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --detach-sign --armor "$file"
        else
            gpg --batch --yes --detach-sign --armor "$file"
        fi

        # Verify the signature
        echo "Verifying signature for $file..."
        gpg --verify "$file.asc" "$file"
    fi
done
cd - > /dev/null

# Create Maven bundle zip
echo "Creating Maven bundle zip..."
ZIP_FILE="$MAVEN_BUNDLE_DIR/$ARTIFACT_ID-$VERSION-bundle.zip"
rm -f "$ZIP_FILE"
(cd "$MAVEN_BUNDLE_TMP" && zip -r "../../$MAVEN_BUNDLE_DIR/$(basename "$ZIP_FILE")" .)

# Create the zip file for Central Portal upload
echo "Creating zip file for Central Portal upload..."
CENTRAL_PORTAL_ZIP="dist/maven-bundles/$ARTIFACT_ID-$VERSION-central-portal.zip"
rm -f "$CENTRAL_PORTAL_ZIP"
(cd "$MAVEN_BUNDLE_TMP" && zip -r "../maven-bundles/$(basename "$CENTRAL_PORTAL_ZIP")" .)

# Clean up temporary directory
echo "Cleaning up temporary files..."
rm -rf dist/tmp-maven-bundle

echo "Mock Server plugin bundle created successfully:"
echo "- Standard bundle: $BUNDLE_DIR"
echo "- Maven bundle: $MAVEN_BUNDLE_DIR/$ARTIFACT_ID-$VERSION-bundle.zip"
echo "- Central Portal bundle: $CENTRAL_PORTAL_ZIP"
echo ""
echo "To upload to Maven Central Portal:"
echo "1. Go to https://central.sonatype.org/publish/publish-portal-upload/"
echo "2. Log in to the Sonatype Portal"
echo "3. Click on 'Upload Artifacts' and select the Central Portal zip file"
echo "4. Follow the instructions to complete the upload process"

# Ask if user wants to open the Central Portal upload page
echo ""
echo "Would you like to open the Central Portal upload page now? (y/n)"
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
    open "https://central.sonatype.org/publish/publish-portal-upload/"
fi
