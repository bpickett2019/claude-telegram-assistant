---
name: notion
description: "Manage Notion pages, databases, and workspaces via API"
metadata:
  openclaw:
    emoji: "📓"
    requires:
      bins: ["curl"]
    env: ["NOTION_API_KEY"]
---

# Notion Skill

Interact with Notion workspaces using the Notion API.

## Prerequisites

```bash
# Get API key from https://www.notion.so/my-integrations
export NOTION_API_KEY="secret_xxxxxxxxxxxxx"

# Share pages/databases with your integration
```

## Common Operations

### Create a Page
```bash
curl -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": { "database_id": "YOUR_DATABASE_ID" },
    "properties": {
      "Name": { "title": [{ "text": { "content": "New Page" } }] }
    }
  }'
```

### Query a Database
```bash
curl -X POST "https://api.notion.com/v1/databases/YOUR_DATABASE_ID/query" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"
```

### Search
```bash
curl -X POST "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -d '{ "query": "search term" }'
```

### Update a Page
```bash
curl -X PATCH "https://api.notion.com/v1/pages/PAGE_ID" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -d '{
    "properties": {
      "Status": { "select": { "name": "Done" } }
    }
  }'
```

## Useful Patterns

```bash
# Create daily note
TODAY=$(date +%Y-%m-%d)
curl -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -d "{
    \"parent\": { \"database_id\": \"$DAILY_NOTES_DB\" },
    \"properties\": {
      \"Name\": { \"title\": [{ \"text\": { \"content\": \"$TODAY\" } }] }
    }
  }"

# Add to reading list
curl -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -d '{
    "parent": { "database_id": "READING_LIST_DB" },
    "properties": {
      "Title": { "title": [{ "text": { "content": "Article Title" } }] },
      "URL": { "url": "https://example.com" }
    }
  }'
```
