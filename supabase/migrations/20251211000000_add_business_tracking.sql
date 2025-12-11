-- Create clients table for business management
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  api_key TEXT UNIQUE NOT NULL,
  webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for clients table
CREATE INDEX idx_clients_business_id ON clients(business_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_api_key ON clients(api_key);

-- Add comment for documentation
COMMENT ON TABLE clients IS 'Stores client/business information for M-Pesa payment API';
COMMENT ON COLUMN clients.business_id IS 'Unique business identifier';
COMMENT ON COLUMN clients.api_key IS 'API key for authenticating requests';
COMMENT ON COLUMN clients.webhook_url IS 'Webhook URL to receive transaction status updates (POST request with transaction data)';

-- Insert initial clients
INSERT INTO clients (business_id, business_name, contact_email, status, api_key) VALUES
  ('caan-developers', 'Caan Developers', 'contact@caandevelopers.com', 'active', 'sk_' || gen_random_uuid()::text),
  ('caan-tech-foundation', 'Caan Tech Foundation', 'contact@caantech.com', 'active', 'sk_' || gen_random_uuid()::text),
  ('taji-ai', 'Taji AI', 'contact@tajiAI.com', 'active', 'sk_' || gen_random_uuid()::text)
ON CONFLICT DO NOTHING;

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_transactions_client FOREIGN KEY (business_id) REFERENCES clients(business_id) ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_checkout_request_id ON transactions(checkout_request_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_business_created ON transactions(business_id, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE transactions IS 'Stores M-Pesa STK Push payment transactions with business tracking';
COMMENT ON COLUMN transactions.business_id IS 'References clients.business_id';
COMMENT ON COLUMN transactions.account_reference IS 'Internal transaction reference for the business';
COMMENT ON COLUMN transactions.status IS 'Transaction status: pending, success, failed';
