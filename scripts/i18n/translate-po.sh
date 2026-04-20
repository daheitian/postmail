#!/usr/bin/env bash
#
# Translate the settings catalog into the given locale using AI.
# Only the settings catalog is auto-translated. The public catalog is
# intentionally English-only — at runtime, non-English locales fall back to
# the source message for any key not in the settings catalog.
#
# Usage: scripts/i18n/translate-po.sh <locale>
#
# Examples:
#   scripts/i18n/translate-po.sh zh-Hans
#   scripts/i18n/translate-po.sh zh-Hant
#
# Env:
#   OPENAI_API_KEY (or CUSTOM_OPENAI_API_KEY)
#   CUSTOM_OPENAI_BASE_URL (optional)

set -euo pipefail

LOCALE="${1:?missing locale (e.g. zh-Hans)}"

API_KEY="${CUSTOM_OPENAI_API_KEY:-${OPENAI_API_KEY:-}}"
if [[ -z "$API_KEY" ]]; then
  echo "OPENAI_API_KEY (or CUSTOM_OPENAI_API_KEY) must be set"
  exit 1
fi

OPENAI_API_KEY="$API_KEY" \
  npx lingui-po-translate \
    --srcFile="packages/core/src/i18n/locales/settings/en.po" \
    --srcLng=en \
    --srcFormat=po \
    --targetFile="packages/core/src/i18n/locales/settings/$LOCALE.po" \
    --targetLng="$LOCALE" \
    --targetFormat=po \
    --glossaryFile="packages/core/src/i18n/locales/glossary.$LOCALE.yml" \
    --service=openai \
    --serviceConfig="$API_KEY" \
    --baseUrl="${CUSTOM_OPENAI_BASE_URL:-https://api.openai.com/v1}"
