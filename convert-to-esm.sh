#!/bin/bash

# Script to convert CommonJS to ES modules in bot/src directory

echo "Converting CommonJS to ES modules..."

# Find all .js files in bot/src
find /home/user/x-engagement-bot/bot/src -name "*.js" -type f | while read file; do
    echo "Processing: $file"

    # Create a backup
    cp "$file" "$file.bak"

    # Convert require() statements
    # const X = require('Y') -> import X from 'Y'
    sed -i "s/const \([a-zA-Z0-9_{}]*\) = require('\([^']*\)');/import \1 from '\2';/g" "$file"
    sed -i 's/const \([a-zA-Z0-9_{}]*\) = require("\([^"]*\)");/import \1 from "\2";/g' "$file"

    # Convert destructured require
    # const { X, Y } = require('Z') -> import { X, Y } from 'Z'
    sed -i "s/const { \([^}]*\) } = require('\([^']*\)');/import { \1 } from '\2';/g" "$file"
    sed -i 's/const { \([^}]*\) } = require("\([^"]*\)");/import { \1 } from "\2";/g' "$file"

    # Convert module.exports = X -> export default X
    sed -i 's/module\.exports = /export default /g' "$file"

    # Convert exports.X = Y -> export const X = Y (for simple cases)
    # This is tricky and may need manual review

    echo "Converted: $file"
done

echo "Conversion complete!"
echo "Backups created with .bak extension"
