/*
  # Corporate Product Customization

  1. New Tables
    - `corporate_product_pricing`
      - `id` (uuid, primary key)
      - `corporate_id` (uuid, references users table)
      - `product_id` (uuid, references products table)
      - `custom_point_cost` (integer) - Custom point cost for this corporate
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `corporate_product_locks`
      - `id` (uuid, primary key)
      - `corporate_id` (uuid, references users table)
      - `product_id` (uuid, references products table)
      - `is_locked` (boolean) - If true, product is hidden from this corporate
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for admin access only
    - Add policies for corporate users to read their own data

  3. Indexes
    - Add composite unique index on (corporate_id, product_id) for both tables
    - Add indexes on corporate_id and product_id for faster queries
*/

-- Create corporate_product_pricing table
CREATE TABLE IF NOT EXISTS corporate_product_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custom_point_cost integer NOT NULL CHECK (custom_point_cost >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(corporate_id, product_id)
);

-- Create corporate_product_locks table
CREATE TABLE IF NOT EXISTS corporate_product_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(corporate_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_corporate_pricing_corporate_id ON corporate_product_pricing(corporate_id);
CREATE INDEX IF NOT EXISTS idx_corporate_pricing_product_id ON corporate_product_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_corporate_locks_corporate_id ON corporate_product_locks(corporate_id);
CREATE INDEX IF NOT EXISTS idx_corporate_locks_product_id ON corporate_product_locks(product_id);

-- Enable RLS
ALTER TABLE corporate_product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_product_locks ENABLE ROW LEVEL SECURITY;

-- Policies for corporate_product_pricing
CREATE POLICY "Admins can read all pricing"
  ON corporate_product_pricing FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert pricing"
  ON corporate_product_pricing FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update pricing"
  ON corporate_product_pricing FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete pricing"
  ON corporate_product_pricing FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Corporates can read their own pricing"
  ON corporate_product_pricing FOR SELECT
  TO authenticated
  USING (corporate_id = auth.uid());

-- Policies for corporate_product_locks
CREATE POLICY "Admins can read all locks"
  ON corporate_product_locks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert locks"
  ON corporate_product_locks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update locks"
  ON corporate_product_locks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete locks"
  ON corporate_product_locks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Corporates can read their own locks"
  ON corporate_product_locks FOR SELECT
  TO authenticated
  USING (corporate_id = auth.uid());
