#!/usr/bin/env python3
"""
Convert CommonJS modules to ES modules in the bot directory
"""

import os
import re
from pathlib import Path

def convert_file(filepath):
    """Convert a single file from CommonJS to ES modules"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern 1: const X = require('Y'); -> import X from 'Y';
    content = re.sub(
        r"const\s+([a-zA-Z0-9_$]+)\s*=\s*require\(['\"]([^'\"]+)['\"]\);?",
        r"import \1 from '\2';",
        content
    )

    # Pattern 2: const { X, Y, Z } = require('module'); -> import { X, Y, Z } from 'module';
    content = re.sub(
        r"const\s+\{([^}]+)\}\s*=\s*require\(['\"]([^'\"]+)['\"]\);?",
        r"import {\1} from '\2';",
        content
    )

    # Pattern 3: module.exports = X; -> export default X;
    content = re.sub(
        r"module\.exports\s*=\s*",
        r"export default ",
        content
    )

    # Pattern 4: exports.X = Y; -> export const X = Y; (only at start of line/after newline)
    content = re.sub(
        r"^exports\.([a-zA-Z0-9_$]+)\s*=\s*",
        r"export const \1 = ",
        content,
        flags=re.MULTILINE
    )

    # Only write if content changed
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    bot_src = Path('/home/user/x-engagement-bot/bot/src')

    if not bot_src.exists():
        print(f"Directory not found: {bot_src}")
        return

    converted_count = 0
    total_count = 0

    # Find all .js files
    for js_file in bot_src.rglob('*.js'):
        total_count += 1
        if convert_file(js_file):
            converted_count += 1
            print(f"✓ Converted: {js_file.relative_to(bot_src)}")

    print(f"\nConversion complete!")
    print(f"Files processed: {total_count}")
    print(f"Files converted: {converted_count}")
    print(f"Files unchanged: {total_count - converted_count}")

if __name__ == '__main__':
    main()
