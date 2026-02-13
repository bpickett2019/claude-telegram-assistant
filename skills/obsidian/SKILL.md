---
name: obsidian
description: "Manage Obsidian vault notes, links, and tags"
metadata:
  openclaw:
    emoji: "🗒️"
    requires:
      bins: []
---

# Obsidian Skill

Manage your Obsidian vault using file operations.

## Setup

```bash
# Set vault path
export OBSIDIAN_VAULT="$HOME/Documents/Obsidian/MyVault"
```

## Create Notes

### Daily Note
```bash
TODAY=$(date +%Y-%m-%d)
cat > "$OBSIDIAN_VAULT/Daily/$TODAY.md" <<EOF
# $TODAY

## Tasks
- [ ]

## Notes

## References

tags: #daily
EOF
```

### New Note with Frontmatter
```bash
cat > "$OBSIDIAN_VAULT/Notes/MyNote.md" <<EOF
---
title: My Note
tags: [note, idea]
created: $(date +%Y-%m-%d)
---

# My Note

Content goes here.

## References
- [[Related Note]]
EOF
```

## Search Vault

### Find by Tag
```bash
grep -r "#tag" "$OBSIDIAN_VAULT" --include="*.md"
```

### Find Backlinks
```bash
grep -r "\[\[My Note\]\]" "$OBSIDIAN_VAULT" --include="*.md"
```

### Find Broken Links
```bash
# Find all [[links]]
grep -roh "\[\[.*\]\]" "$OBSIDIAN_VAULT" --include="*.md" | sort -u
```

## Organize

### Add Tag to Note
```bash
echo "" >> "$OBSIDIAN_VAULT/Note.md"
echo "tags: #newtag" >> "$OBSIDIAN_VAULT/Note.md"
```

### Create Index
```bash
cat > "$OBSIDIAN_VAULT/INDEX.md" <<EOF
# Index

## Recent Notes
$(ls -t "$OBSIDIAN_VAULT"/*.md | head -10 | xargs -I {} basename {} .md | sed 's/^/- [[/')

## Tags
$(grep -roh "#\w+" "$OBSIDIAN_VAULT" --include="*.md" | sort -u | sed 's/^/- /')
EOF
```

## Link Notes

### Create Bidirectional Link
```bash
NOTE1="$OBSIDIAN_VAULT/Note1.md"
NOTE2="$OBSIDIAN_VAULT/Note2.md"

echo "[[Note2]]" >> "$NOTE1"
echo "[[Note1]]" >> "$NOTE2"
```
