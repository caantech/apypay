# Transaction Recording Fix

## Root Cause Found! ✅

**M-Pesa Callback IS Being Called** - But failing due to business_id parsing error!

Error from Callback Function:
```
Key (business_id)=(unknown) is not present in table "clients".
insert or update on table "transactions" violates foreign key constraint "fk_transactions_client"
```

## Problem
When M-Pesa calls the callback with the transaction result, the callback function fails to extract `business_id` from the `AccountReference` field. Instead of getting `"caan-developers"`, it's setting `business_id="unknown"`, which violates the foreign key constraint.

## Root Issue
In `callback-direct-stk/index.ts`, the code extracts business_id by splitting the AccountReference string:
```typescript
const accountRef = String(metadata.AccountReference || stkCallback.CheckoutRequestID)
const [businessId, actualAccountReference] = accountRef.includes(":")
  ? accountRef.split(":")
  : ["unknown", accountRef]
```

The problem: **M-Pesa is not returning the AccountReference in the expected format** or it's located in a different field in the metadata.

## Solution Applied
Updated the callback function to:
1. Try multiple field names: `AccountReference`, `account_reference`
2. Add detailed logging to see what data is being received
3. Better error handling for the split operation

## Testing
- ✅ M-Pesa API works - STK push initiated successfully
- ✅ M-Pesa calls the callback endpoint - 200 response
- ✅ Database accepts manual inserts - works fine
- ❌ Callback insert fails due to `business_id="unknown"`
- 📝 Need to add logging to see the actual M-Pesa callback structure

## Next Steps to Complete Fix
1. **Check callback logs with updated code** - look for "Parsed business_id" and "Extracted metadata" log lines
2. **Verify M-Pesa payload structure** - see what fields are actually being sent
3. **Adjust AccountReference parsing logic** based on actual data received
4. **Test with working M-Pesa callback** to confirm transactions are recorded

## Status
**Issue Identified & Partially Fixed** - Callback infrastructure works, just need to fix the business_id extraction logic based on actual M-Pesa payload.
