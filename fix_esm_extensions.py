#!/usr/bin/env python3
"""
Add .js extensions to relative imports for ES modules
"""

import os
import re
from pathlib import Path

def fix_extensions(filepath):
    """Add .js extensions to relative imports"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern: import X from './path' -> import X from './path.js'
    # Pattern: import X from '../path' -> import X from '../path.js'
    # Only if path doesn't already end with .js and is a relative path
    def add_js_extension(match):
        import_statement = match.group(0)
        path = match.group(2)

        # Skip if already has .js extension
        if path.endswith('.js'):
            return import_statement

        # Skip if it's a package (no ./ or ../)
        if not (path.startswith('./') or path.startswith('../')):
            return import_statement

        # Add .js extension
        return import_statement.replace(f"'{path}'", f"'{path}.js'").replace(f'"{path}"', f'"{path}.js"')

    # Match: import ... from 'path' or import ... from "path"
    content = re.sub(
        r"(import\s+.*?\s+from\s+)(['\"])([^'\"]+)\2",
        lambda m: m.group(1) + m.group(2) + (m.group(3) + '.js' if (m.group(3).startswith('./') or m.group(3).startswith('../')) and not m.group(3).endswith('.js') else m.group(3)) + m.group(2),
        content
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

    fixed_count = 0
    total_count = 0

    # Find all .js files
    for js_file in bot_src.rglob('*.js'):
        total_count += 1
        if fix_extensions(js_file):
            fixed_count += 1
            print(f"✓ Fixed: {js_file.relative_to(bot_src)}")

    print(f"\nExtension fix complete!")
    print(f"Files processed: {total_count}")
    print(f"Files fixed: {fixed_count}")
    print(f"Files unchanged: {total_count - fixed_count}")

if __name__ == '__main__':
    main()
