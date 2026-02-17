#!/bin/bash
# scripts/setup-remote.sh
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Install mise
curl -fsSL https://mise.run | sh
export PATH="$HOME/.local/bin:$PATH"

# Install entire
curl -fsSL https://entire.io/install.sh | bash

# Install Node.js and pnpm via mise
mise install

# Install dependencies
pnpm install
