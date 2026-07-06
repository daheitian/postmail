# Fix check-format

## Plan

- [x] Ignore generated/template artifacts that Prettier cannot parse safely.
- [x] Format regular source files reported by `mise run check-format`.
- [x] Re-run `mise run check-format` and record the result.

## Results

- Added Prettier ignore entries for Hugo layout templates and generated demo
  site-export client bundles.
- Ran Prettier on the regular source/test files that were only style warnings.
- Verified with `mise run check-format`: passed.
- Note: npm still prints `Unknown project config "auto-install-peers"`, but the
  format check exits successfully.
