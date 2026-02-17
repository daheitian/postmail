#!/bin/bash
# scripts/setup-remote.sh
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Ensure $HOME/.local/bin is in PATH for this script and all future shells
export PATH="$HOME/.local/bin:$PATH"
grep -qxF 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc" 2>/dev/null \
  || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"

# Install mise
curl -fsSL https://mise.run | sh

# Install entire
curl -fsSL https://entire.io/install.sh | bash

# Install Node.js and pnpm via mise
mise install

# Install dependencies
pnpm install
