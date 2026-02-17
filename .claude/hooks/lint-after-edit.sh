#!/bin/bash
# Auto-lint after file edits to catch syntax errors and duplicate variables

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only lint TypeScript/JavaScript files
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  npx eslint --no-error-on-unmatched-pattern "$FILE_PATH" 2>&1 | head -20
fi

exit 0
