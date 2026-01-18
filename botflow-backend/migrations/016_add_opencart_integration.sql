-- Migration 016: Add OpenCart Integration with Database Connection
-- Created: 2026-01-18

-- First, add credential_schema column if it doesn't exist
ALTER TABLE integration_marketplace
ADD COLUMN IF NOT EXISTS credential_schema JSONB DEFAULT NULL;

COMMENT ON COLUMN integration_marketplace.credential_schema IS 'JSON Schema defining the required credentials for this integration';

-- Add OpenCart integration with database connection support
INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url, credential_schema
) VALUES
('opencart', 'OpenCart', 'ecommerce',
 'Open-source ecommerce platform with direct DB access',
 'Connect directly to your OpenCart store via MySQL database for real-time product, order, and customer data. Popular in South Africa for its flexibility and low cost. Supports direct database queries for maximum reliability.',
 'https://www.opencart.com/favicon.ico',
 true, 'database', 'free', true, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['products', 'orders', 'customers', 'categories', 'inventory', 'reviews', 'real_time_sync'],
 'custom', 80,
 '{"steps": ["Get your MySQL database credentials from your hosting provider (cPanel, Plesk, or ask your host)", "Find your OpenCart database name - check config.php in your OpenCart root folder", "The table prefix is usually oc_ but check config.php for DB_PREFIX", "For security, create a read-only MySQL user if you only need to read data", "If your database is remote, ensure your IP is whitelisted in MySQL"]}'::jsonb,
 'https://docs.opencart.com/',
 '{"type": "object", "required": ["db_host", "db_name", "db_user", "db_password"], "properties": {"db_host": {"type": "string", "title": "Database Host", "description": "MySQL server hostname (e.g., localhost, 127.0.0.1, or your hosting server IP)", "placeholder": "localhost"}, "db_port": {"type": "number", "title": "Database Port", "description": "MySQL port (default: 3306)", "default": 3306}, "db_name": {"type": "string", "title": "Database Name", "description": "Your OpenCart database name (find in config.php as DB_DATABASE)", "placeholder": "opencart_db"}, "db_user": {"type": "string", "title": "Database Username", "description": "MySQL username with access to the database", "placeholder": "opencart_user"}, "db_password": {"type": "string", "title": "Database Password", "description": "MySQL password", "format": "password"}, "table_prefix": {"type": "string", "title": "Table Prefix", "description": "OpenCart table prefix (find in config.php as DB_PREFIX, default: oc_)", "default": "oc_", "placeholder": "oc_"}, "ssl_enabled": {"type": "boolean", "title": "Use SSL Connection", "description": "Enable SSL/TLS for secure database connection (recommended for remote databases)", "default": false}}}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  long_description = EXCLUDED.long_description,
  auth_type = EXCLUDED.auth_type,
  setup_instructions = EXCLUDED.setup_instructions,
  credential_schema = EXCLUDED.credential_schema,
  is_featured = EXCLUDED.is_featured,
  supported_features = EXCLUDED.supported_features;
