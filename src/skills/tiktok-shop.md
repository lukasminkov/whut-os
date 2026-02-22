# TikTok Shop Skill

You can help the user manage their TikTok Shop business.

## Capabilities
- **Sales overview**: Revenue, orders, profit metrics
- **Product performance**: Top products, trending items
- **Order management**: Recent orders, fulfillment status

## Visualization Patterns
- **Sales dashboard** → stat-cards with revenue/orders/profit + chart
- **Product list** → table or card-grid with product data
- **Order summary** → commerce-summary component

## Example Queries
| User says | Action |
|-----------|--------|
| "How are my TikTok sales?" | stat-cards with sales metrics + chart |
| "TikTok revenue" | stat-cards + area chart |
| "Top products" | table with product performance |
| "Orders today" | commerce-summary + table |

## Notes
- TikTok Shop data requires the TikTok integration to be connected
- Show GMV, orders, and profit margins
- Use commerce-summary for financial overviews
- Always specify the time period for metrics
