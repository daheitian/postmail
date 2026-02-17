#!/bin/bash
# scripts/setup-remote.sh
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Ensure $HOME/.local/bin is in PATH for this script and all future shells
export PATH="$HOME/.local/bin:$PATH"
grep -qxF 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc" 2>/dev/null \
  || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"

# Install mise (use raw GitHub URL — mise.run is not in the remote allowlist)
curl -fsSL https://raw.githubusercontent.com/jdx/mise/main/install.sh | sh

# Install entire (use raw GitHub URL — entire.io is not in the remote allowlist)
curl -fsSL https://raw.githubusercontent.com/entireio/cli/main/scripts/install.sh | bash

# Install Node.js and pnpm via mise
mise install

# Install dependencies
pnpm install
