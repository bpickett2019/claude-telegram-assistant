---
name: email
description: "Send emails via SMTP and manage drafts"
metadata:
  openclaw:
    emoji: "📧"
    requires:
      bins: ["curl", "mail"]
    env: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]
---

# Email Skill

Send emails using SMTP or mail command.

## Setup

```bash
# Configure SMTP
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your@email.com"
export SMTP_PASS="your-app-password"
```

## Send Email (curl)

### Simple Email
```bash
curl --url "smtp://$SMTP_HOST:$SMTP_PORT" \
  --mail-from "$SMTP_USER" \
  --mail-rcpt "recipient@example.com" \
  --user "$SMTP_USER:$SMTP_PASS" \
  --upload-file - <<EOF
From: $SMTP_USER
To: recipient@example.com
Subject: Test Email

This is the email body.
EOF
```

### HTML Email
```bash
curl --url "smtp://$SMTP_HOST:$SMTP_PORT" \
  --mail-from "$SMTP_USER" \
  --mail-rcpt "recipient@example.com" \
  --user "$SMTP_USER:$SMTP_PASS" \
  --upload-file - <<EOF
From: $SMTP_USER
To: recipient@example.com
Subject: HTML Email
Content-Type: text/html; charset=utf-8

<html>
<body>
  <h1>Hello!</h1>
  <p>This is an <strong>HTML</strong> email.</p>
</body>
</html>
EOF
```

### Email with Attachment (mail command)
```bash
echo "Email body" | mail -s "Subject" \
  -a "/path/to/attachment.pdf" \
  recipient@example.com
```

## Templates

### Meeting Follow-up
```bash
send_meeting_followup() {
  local RECIPIENT=$1
  local MEETING_TOPIC=$2

  curl --url "smtp://$SMTP_HOST:$SMTP_PORT" \
    --mail-from "$SMTP_USER" \
    --mail-rcpt "$RECIPIENT" \
    --user "$SMTP_USER:$SMTP_PASS" \
    --upload-file - <<EOF
From: $SMTP_USER
To: $RECIPIENT
Subject: Follow-up: $MEETING_TOPIC

Hi,

Thanks for meeting today about $MEETING_TOPIC.

Action items:
- [ ] Item 1
- [ ] Item 2

Let me know if you have questions!
EOF
}
```

### Bulk Email
```bash
for EMAIL in $(cat recipients.txt); do
  curl --url "smtp://$SMTP_HOST:$SMTP_PORT" \
    --mail-from "$SMTP_USER" \
    --mail-rcpt "$EMAIL" \
    --user "$SMTP_USER:$SMTP_PASS" \
    --upload-file - <<EOF
From: $SMTP_USER
To: $EMAIL
Subject: Newsletter

Hello!

Your newsletter content here.
EOF
  sleep 1  # Rate limiting
done
```

## Gmail App Password

For Gmail:
1. Go to Google Account settings
2. Security → 2-Step Verification
3. App passwords → Generate
4. Use that as SMTP_PASS
