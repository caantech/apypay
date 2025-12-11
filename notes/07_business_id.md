```bash

[supabase\apypay][main]
>> curl -s -X POST "https://sgyoocjbdfwzygmpmurc.supabase.co/functions/v1/direct-stk" -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneW9vY2piZGZ3enlnbXBtdXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzc0ODMsImV4cCI6MjA3OTg1MzQ4M30.BQ5i6ZQXMenWL5S9kv1Bvh7wMU7NG36xz61tneYvxEE" -d '{"mpesa_number":"0723224644","amount":1,"account_reference":"trans_00001","transaction_desc":"Youtube-Donation","business_id":"caan-tech-foundation"}'
{"success":true,"message":"STK Push initiated successfully","checkoutRequestID":"ws_CO_11122025201138449723224644","businessId":"caan-tech-foundation"}
[supabase\apypay][main]
>> 

```


Check the transaction records in the database to confirm that the transaction business_id is correctly recorded as "caan-tech-foundation" and not the previous incorrect value.