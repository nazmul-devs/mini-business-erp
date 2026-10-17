# Architecture notes

## Request flow
Browser (`apps/web`) -> REST API (`apps/api`) -> Prisma (`packages/database`) -> PostgreSQL.

## Suggested implementation order
1. Auth and current-user middleware.
2. Party and product CRUD.
3. Purchase create/complete workflow: validate items, create document, increase stock, write stock movements in one DB transaction.
4. Sale create/complete workflow: validate available stock, snapshot unit cost, create invoice, decrease stock, write stock movements in one DB transaction.
5. Expense CRUD.
6. Reports: ledger, purchase, inventory, sales, expenses, profit/loss.
7. Add a small AI feature, such as expense category suggestions or AI-generated expense summaries.

## Accounting/reporting notes
- Derive totals from line items on the server; do not trust client-supplied totals.
- A draft should not change inventory. Completing a purchase/sale should change stock exactly once.
- Prevent negative stock unless explicitly allowed.
- Keep `unitCostAtSale` to calculate cost of goods sold (COGS) consistently.
- For a simple MVP, define ledger as party transaction history and balance; do not claim full double-entry accounting unless journal entries are implemented.
- Profit/loss should use sales revenue minus COGS minus expenses, not sales minus all purchases.
- Add authorization so users only access their own data if the application is multi-user. Before production, add tenant/owner relations to business records.
