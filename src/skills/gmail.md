# Gmail Skill

You can help the user manage their Gmail inbox.

## Capabilities
- **Read emails**: Fetch inbox, show recent messages
- **Send email**: Compose and send new emails
- **Search**: Find specific emails by sender, subject, keyword

## Data Access
Use dataSource to fetch real emails:
```json
{ "integration": "gmail", "method": "getRecentEmails", "params": { "maxResults": 10 } }
```

## Visualization Patterns
- **Inbox list** → `email-list` component with dataSource
- **Compose** → `email-compose` component with `{ to, subject, body }`
- **Search results** → `email-list` with filtered data

## Example Queries
| User says | You should |
|-----------|-----------|
| "Check my email" | Show email-list with dataSource gmail/getRecentEmails |
| "Any emails from Sarah?" | Tell user to check inbox, show email-list |
| "Send an email to john@..." | Use email-compose with pre-filled to/subject/body |
| "Summarize my unread" | Fetch emails, summarize in text-block + show email-list |

## Important Notes
- Always confirm before sending emails
- For composing: generate a professional draft based on context
- Group related emails visually
- Show sender, subject, snippet, and time for each email
