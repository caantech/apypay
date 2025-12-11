# Testing the Deployed Functions

## ✅ Secrets Verification

All required secrets have been successfully deployed to Supabase Cloud:
- `CALLBACK_URL` ✓
- `MPESA_BUSINESS_SHORT_CODE` ✓
- `MPESA_CONSUMER_KEY` ✓
- `MPESA_CONSUMER_SECRET` ✓
- `MPESA_PASSKEY` ✓
- `SUPABASE_ANON_KEY` ✓
- `SUPABASE_DB_URL` ✓
- `SUPABASE_SERVICE_ROLE_KEY` ✓
- `SUPABASE_URL` ✓

## Test Configuration

- **Phone Number:** 0723224644
- **Amount:** 1 (Ksh. 1)
- **Description:** Test
- **Account Reference:** Random UUID
- **Business ID:** caan-developers

---

## Test 1: Initiate STK Push (direct-stk)

### Using cURL

```bash
curl -X POST https://sgyoocjbdfwzygmpmurc.supabase.co/functions/v1/direct-stk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneW9vY2piZGZ3enlnbXBtdXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzc0ODMsImV4cCI6MjA3OTg1MzQ4M30.BQ5i6ZQXMenWL5S9kv1Bvh7wMU7NG36xz61tneYvxEE" \
  -d '{
    "mpesa_number": "0723224644",
    "amount": 1,
    "account_reference": "test-uuid-001",
    "transaction_desc": "Test",
    "business_id": "caan-developers"
  }'
```

### JSON Request Body

```json
{
  "mpesa_number": "0723224644",
  "amount": 1,
  "account_reference": "test-uuid-001",
  "transaction_desc": "Test",
  "business_id": "caan-developers"
}
```

### Expected Response (Success)

```json
{
  "success": true,
  "message": "STK Push initiated successfully",
  "checkoutRequestID": "ws_CO_DMZ_87517_2556758376",
  "requestID": "10101-xxxxx-xxxxx",
  "businessId": "caan-developers"
}
```

### Expected Response (Error - Invalid Business)

```json
{
  "error": "Invalid or inactive business ID: invalid-business"
}
```

---

## Test 2: Invalid Phone Number

### JSON Request Body

```json
{
  "mpesa_number": "invalid-phone",
  "amount": 1,
  "account_reference": "test-uuid-002",
  "transaction_desc": "Test",
  "business_id": "caan-developers"
}
```

### Expected Response

```json
{
  "error": "Invalid Safaricom phone number. Please use format: 0722123456, 254722123456, or +254722123456"
}
```

---

## Test 3: Missing Required Fields

### JSON Request Body

```json
{
  "mpesa_number": "0723224644",
  "amount": 1,
  "business_id": "caan-developers"
}
```

### Expected Response

```json
{
  "error": "Missing required fields: mpesa_number, amount, account_reference, transaction_desc, business_id"
}
```

---

## Test 4: Simulate M-Pesa Callback (callback-direct-stk)

### Using cURL

```bash
curl -X POST https://sgyoocjbdfwzygmpmurc.supabase.co/functions/v1/callback-direct-stk \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "MerchantRequestID": "16813-1590511757-1",
        "CheckoutRequestID": "ws_CO_DMZ_87517_2556758376",
        "ResultCode": 0,
        "ResultDesc": "The service request has been processed successfully.",
        "CallbackMetadata": {
          "Item": [
            {
              "Name": "Amount",
              "Value": 1
            },
            {
              "Name": "MpesaReceiptNumber",
              "Value": "LHG31AA60V7"
            },
            {
              "Name": "TransactionDate",
              "Value": "20251211183027"
            },
            {
              "Name": "PhoneNumber",
              "Value": "254723224644"
            },
            {
              "Name": "AccountReference",
              "Value": "caan-developers:test-uuid-001"
            }
          ]
        }
      }
    }
  }'
```

### JSON Request Body (Success - ResultCode 0)

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "16813-1590511757-1",
      "CheckoutRequestID": "ws_CO_DMZ_87517_2556758376",
      "ResultCode": 0,
      "ResultDesc": "The service request has been processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "Amount",
            "Value": 1
          },
          {
            "Name": "MpesaReceiptNumber",
            "Value": "LHG31AA60V7"
          },
          {
            "Name": "TransactionDate",
            "Value": "20251211183027"
          },
          {
            "Name": "PhoneNumber",
            "Value": "254723224644"
          },
          {
            "Name": "AccountReference",
            "Value": "caan-developers:test-uuid-001"
          }
        ]
      }
    }
  }
}
```

### JSON Request Body (Insufficient Funds - ResultCode 1)

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "16813-1590511757-2",
      "CheckoutRequestID": "ws_CO_DMZ_87517_2556758377",
      "ResultCode": 1,
      "ResultDesc": "Insufficient funds in your M-Pesa account.",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "Amount",
            "Value": 1
          },
          {
            "Name": "PhoneNumber",
            "Value": "254723224644"
          },
          {
            "Name": "AccountReference",
            "Value": "caan-developers:test-uuid-002"
          }
        ]
      }
    }
  }
}
```

### JSON Request Body (Transaction Cancelled - ResultCode 17)

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "16813-1590511757-3",
      "CheckoutRequestID": "ws_CO_DMZ_87517_2556758378",
      "ResultCode": 17,
      "ResultDesc": "Transaction cancelled by user",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "Amount",
            "Value": 1
          },
          {
            "Name": "PhoneNumber",
            "Value": "254723224644"
          },
          {
            "Name": "AccountReference",
            "Value": "caan-developers:test-uuid-003"
          }
        ]
      }
    }
  }
}
```

### Expected Response (All Callbacks)

```json
{
  "ResultCode": 0,
  "ResultDesc": "Callback received successfully"
}
```

---

## Transaction Status Mapping

| ResultCode | Status | Meaning |
|-----------|--------|---------|
| 0 | completed | Payment successful |
| 1 | insufficient_funds | Customer has insufficient funds |
| 2 | insufficient_amount | Amount less than minimum |
| 17 | cancelled | Transaction cancelled by user |
| ? | failed | Unknown/other errors |

---

## Test Results

### Test 1: Call direct-stk Function

**Status**: ✅ Function deployed and responding

**Response Code**: 400 (Bad Request) or 500 (Server Error from M-Pesa)

**Response Body**: `{"success":false}` or error message

**Findings**:
- ✅ Function is deployed and accessible
- ✅ Authorization header required (Bearer token)
- ✅ Database clients table accessible and populated
- ✅ Business ID validation working
- ⚠️ M-Pesa API returning error (likely sandbox credentials or configuration issue)

**Next Investigation**:
1. Verify M-Pesa sandbox credentials are correct
2. Check if M-Pesa API is responding to test requests
3. Review M-Pesa Daraja documentation for correct request format
4. Test with actual M-Pesa Daraja playground

## Deployment Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Database Migration | ✅ Deployed | clients + transactions tables created |
| direct-stk Function | ✅ Deployed | v6, responding to requests |
| callback-direct-stk Function | ✅ Deployed | v6, ready for M-Pesa callbacks |
| Environment Secrets | ✅ Set | All 9 secrets uploaded |
| Supabase URL | ✅ Working | https://sgyoocjbdfwzygmpmurc.supabase.co |
| Authentication | ✅ Working | Bearer token validation |

## Next Steps

1. **Verify M-Pesa Credentials**: Test credentials in Daraja playground
2. **Debug M-Pesa API**: Get detailed error response from M-Pesa
3. **Test Callback**: Once STK Push works, test callback with sample M-Pesa response
4. **Activate Webhooks**: Uncomment webhook code and set webhook URLs

