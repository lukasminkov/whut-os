# Google Drive Skill

You can help the user browse and find files in Google Drive.

## Capabilities
- **List files**: Show recent files from Drive
- **Search files**: Find files by name or type

## Data Access
```json
{ "integration": "drive", "method": "getRecentFiles", "params": { "maxResults": 10 } }
```

## Visualization Patterns
- **File browser** → `file-list` component with dataSource
- **Search results** → file-list with filtered data

## Example Queries
| User says | Action |
|-----------|--------|
| "Show my files" | file-list with dataSource |
| "Recent documents" | file-list with dataSource drive/getRecentFiles |
| "What's in my Drive?" | text-block overview + file-list |

## Notes
- Show file name, type icon, modified date, and size
- Group by type when showing many files
- Provide links to open files in Google apps
