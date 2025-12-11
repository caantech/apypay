-- Create transactions table with business tracking
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id TEXT NOT NULL UNIQUE,
  merchant_request_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  account_reference TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  result_code INTEGER NOT NULL,
  result_desc TEXT NOT NULL,
  mpesa_receipt_number TEXT,
  transaction_date TEXT,
  callback_raw JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_checkout_request_id ON transactions(checkout_request_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_business_created ON transactions(business_id, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE transactions IS 'Stores M-Pesa STK Push payment transactions with business tracking';
COMMENT ON COLUMN transactions.business_id IS 'Business identifier (caan-developers, caan-tech-foundation, taji-ai)';
COMMENT ON COLUMN transactions.account_reference IS 'Internal transaction reference for the business';
COMMENT ON COLUMN transactions.status IS 'Transaction status: pending, success, failed';
