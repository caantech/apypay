# Business Tracking Implementation

## Overview
Updated the M-Pesa edge functions to support multi-tenant payment tracking by business. This allows you to manage payouts separately for each business (Caan Developers, Caan Tech Foundation, and Taji AI).

## Changes Made

### 1. Updated `direct-stk` Function
**File:** `supabase/functions/direct-stk/index.ts`

#### New Field
- Added `business_id` to the request payload (required field)

#### New Validation
- `validateBusinessId()` function validates against allowed businesses:
  - `caan-developers`
  - `caan-tech-foundation`
  - `taji-ai`
- Returns clear error messages if business_id is invalid

#### Updated Request Format
```json
{
  "mpesa_number": "0723224644",
  "amount": 100,
  "account_reference": "ORDER_2025_001",
  "transaction_desc": "Payment for services",
  "business_id": "caan-developers"
}
```

#### Account Reference Format
- M-Pesa AccountReference is now formatted as: `{business_id}:{account_reference}`
- Example: `caan-developers:ORDER_2025_001`
- This allows tracking which business initiated the transaction

### 2. Updated `callback-direct-stk` Function
**File:** `supabase/functions/callback-direct-stk/index.ts`

#### New Fields in Transaction Record
- `business_id` - Extracted from the account reference
- `account_reference` - The internal transaction reference (without business_id prefix)

#### Callback Processing
- Parses the account reference to extract `business_id` and `account_reference`
- Stores both fields separately in the database for easy filtering

#### Example Transaction Record
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "checkout_request_id": "ws_CO_DMZ_87517_2556758376",
  "merchant_request_id": "16813-1590511757-1",
  "business_id": "caan-developers",
  "account_reference": "ORDER_2025_001",
  "phone_number": "254723000000",
  "amount": 100,
  "mpesa_receipt_number": "LHG31AA60V7",
  "status": "success",
  "created_at": "2025-12-11T10:30:45Z"
}
```

### 3. Database Migration
**File:** `supabase/migrations/20251211000000_add_business_tracking.sql`

#### New Table: `transactions`
Columns:
- `id` - UUID primary key
- `checkout_request_id` - M-Pesa checkout request ID (unique)
- `merchant_request_id` - M-Pesa merchant request ID
- `business_id` - Business identifier (indexed)
- `account_reference` - Internal transaction reference
- `phone_number` - Customer phone number
- `amount` - Transaction amount
- `result_code` - M-Pesa result code
- `result_desc` - M-Pesa result description
- `mpesa_receipt_number` - M-Pesa receipt number (if successful)
- `transaction_date` - M-Pesa transaction date
- `callback_raw` - Full callback payload (JSONB)
- `status` - Transaction status (pending/success/failed)
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

#### Indexes Created
- `idx_transactions_business_id` - Fast filtering by business
- `idx_transactions_checkout_request_id` - Lookup by checkout ID
- `idx_transactions_status` - Filter by transaction status
- `idx_transactions_created_at` - Sort by creation date
- `idx_transactions_business_created` - Combined index for business + date queries

## Usage Examples

### Initiating a Payment (for Caan Developers)
```bash
curl -X POST http://localhost:54321/functions/v1/direct-stk \
  -H "Content-Type: application/json" \
  -d '{
    "mpesa_number": "0723224644",
    "amount": 100,
    "account_reference": "ORDER_2025_001",
    "transaction_desc": "Payment for services",
    "business_id": "caan-developers"
  }'
```

### Querying Transactions by Business
```sql
-- Get all transactions for Caan Developers
SELECT * FROM transactions 
WHERE business_id = 'caan-developers' 
ORDER BY created_at DESC;

-- Get successful transactions for a specific business
SELECT * FROM transactions 
WHERE business_id = 'caan-developers' 
AND status = 'success' 
ORDER BY created_at DESC;

-- Calculate total amount collected per business
SELECT business_id, SUM(amount) as total_amount, COUNT(*) as transaction_count
FROM transactions 
WHERE status = 'success'
GROUP BY business_id;

-- Get transactions for a specific date range
SELECT * FROM transactions 
WHERE business_id = 'caan-developers' 
AND created_at >= '2025-12-01' 
AND created_at < '2025-12-11'
ORDER BY created_at DESC;
```

## Benefits

1. **Easy Business Identification** - Know immediately which business initiated each transaction
2. **Payout Management** - Filter transactions by business to manage payouts separately
3. **Audit Trail** - Complete history of which business made which transaction
4. **Analytics** - Generate reports per business (total collections, transaction count, etc.)
5. **Separation of Concerns** - Each business's transactions are cleanly separated

## Next Steps

1. Apply the migration to your Supabase database:
   ```bash
   supabase db push
   ```

2. Deploy the updated functions:
   ```bash
   supabase functions deploy direct-stk
   supabase functions deploy callback-direct-stk
   ```

3. Update any client applications to include `business_id` in requests

4. Set up monitoring/alerts for transaction processing
