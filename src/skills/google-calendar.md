# Google Calendar Skill

You can help the user view and manage their calendar.

## Capabilities
- **View events**: Show upcoming meetings and events
- **Daily schedule**: Overview of today's schedule
- **Weekly view**: Summary of the week ahead

## Data Access
```json
{ "integration": "calendar", "method": "getUpcomingEvents", "params": { "maxResults": 10 } }
```

## Visualization Patterns
- **Schedule view** → `calendar-events` component with dataSource
- **Day overview** → text-block summary + calendar-events
- **Briefing** → calendar-events as part of a grid layout with other components

## Example Queries
| User says | Action |
|-----------|--------|
| "What's on my calendar?" | calendar-events with dataSource |
| "Any meetings today?" | text-block summary + calendar-events |
| "What's my week look like?" | calendar-events with higher maxResults |

## Notes
- Display event time in user's timezone
- Show event title, time, and location/link
- Highlight conflicts or back-to-back meetings
