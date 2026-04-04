# Agent Content Automation

This folder shows the shortest path for content automation in a generated Jant site.

Prefer the local CLI when the agent is already on the site machine. Use MCP only when the caller already speaks MCP.

## Publish a note from JSON

```bash
npx jant posts create --input ./examples/agent-content-automation/note.json
```

## Publish a quote from JSON

```bash
npx jant posts create --input ./examples/agent-content-automation/quote.json
```

## Update site settings from JSON

```bash
npx jant settings update --input ./examples/agent-content-automation/site-settings.json
```

## Upload an image, then attach it to a post

Upload the file:

```bash
npx jant media upload ./path/to/photo.webp --alt "Cover image"
```

That returns a `med_*` ID. Use it in a post payload:

```json
{
  "format": "note",
  "title": "A post with media",
  "bodyMarkdown": "Uploaded through the local CLI.",
  "status": "published",
  "visibility": "public",
  "attachments": [{ "type": "media", "mediaId": "med_..." }]
}
```

Then publish it:

```bash
npx jant posts create --json '{"format":"note","title":"A post with media","bodyMarkdown":"Uploaded through the local CLI.","status":"published","visibility":"public","attachments":[{"type":"media","mediaId":"med_..."}]}'
```

## Inline text attachments stay in the post payload

File uploads create reusable media records. Inline reading notes and markdown snippets stay inside the post payload itself:

```json
{
  "format": "note",
  "bodyMarkdown": "A note with an attached markdown excerpt.",
  "status": "published",
  "visibility": "public",
  "attachments": [
    {
      "type": "text",
      "contentFormat": "markdown",
      "content": "## Reading note\n\nKeep this attached to the post."
    }
  ]
}
```

## MCP example

Initialize:

```bash
curl -X POST "$JANT_URL/api/mcp" \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}'
```

Create a post through `tools/call`:

```bash
curl -X POST "$JANT_URL/api/mcp" \
  -H "Authorization: Bearer $JANT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"jant_posts_create","arguments":{"format":"note","bodyMarkdown":"Created through MCP.","status":"published","visibility":"public"}}}'
```
