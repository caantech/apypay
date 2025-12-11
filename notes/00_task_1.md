# Implement Edge Function to Initiate M-Pesa STK Push Payment in Supabase Cloud

### overview
Implement an edge function in Supabase Cloud that initiates an M-Pesa STK Push payment request when called. The function should accept parameters such as phone number, amount, account reference, and transaction description, and return the response from the M-Pesa API.

### plan 1
1. Index the code implementation and ensure it is structured properly for Supabase Edge Functions. Check for $mpesa_number error handling, making sure it is a valid safaricom number. Ensure the function reads M-Pesa API credentials from environment variables.


```json
    {
        "mpesa_number": "0723224644",
        "amount": 100,
        "account_reference": "test_001",
        "transaction_desc": "Test Payment"
    }
```
