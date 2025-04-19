#!/bin/bash

# Make the script exit on any error
set -e

# Function to replace text in files
replace_in_files() {
    local search=$1
    local replace=$2
    local file_pattern=$3
    
    echo "Replacing '$search' with '$replace' in $file_pattern files..."
    
    # Find files matching the pattern and replace text
    find . -type f -name "$file_pattern" -not -path "*/node_modules/*" -not -path "*/target/*" -not -path "*/.git/*" -not -path "*/dist/*" | while read file; do
        # Skip binary files
        if file "$file" | grep -q "text"; then
            echo "Processing $file"
            sed -i '' "s/$search/$replace/g" "$file"
        fi
    done
}

# Replace in all file types
replace_in_files "kraven" "kraven" "*.xml"
replace_in_files "kraven" "kraven" "*.java"
replace_in_files "kraven" "kraven" "*.properties"
replace_in_files "kraven" "kraven" "*.json"
replace_in_files "kraven" "kraven" "*.ts"
replace_in_files "kraven" "kraven" "*.html"
replace_in_files "kraven" "kraven" "*.scss"
replace_in_files "kraven" "kraven" "*.md"
replace_in_files "kraven" "kraven" "*.sh"

# Replace in specific files that might have been missed
replace_in_files "NovaDocs" "Kraven" "*.java"
replace_in_files "NovaDocs" "Kraven" "*.xml"
replace_in_files "NovaDocs" "Kraven" "*.html"
replace_in_files "NovaDocs" "Kraven" "*.ts"

echo "Replacement complete!"
