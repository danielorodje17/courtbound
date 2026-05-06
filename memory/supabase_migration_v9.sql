-- Migration v9: Add price_annual to pricing_plans and add season_pass tier

-- 1. Add annual price column
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS price_annual NUMERIC(10,2);

-- 2. Seed annual prices for existing plans (adjust values as needed)
UPDATE pricing_plans SET price_annual = 79.00 WHERE tier = 'basic';
UPDATE pricing_plans SET price_annual = 159.00 WHERE tier = 'premium';

-- 3. Add season_pass plan
INSERT INTO pricing_plans (tier, name, price_monthly, price_annual, currency, description, features)
VALUES (
    'season_pass',
    'Season Pass',
    49.00,
    49.00,
    'GBP',
    'One-time 4-month access. Perfect for players already mid-process.',
    '["Full Scholarship features", "4 months access", "No auto-renewal", "Ideal for families mid-process"]'::jsonb
)
ON CONFLICT (tier) DO NOTHING;
