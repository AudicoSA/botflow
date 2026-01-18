-- Migration 009 v2: Fix South African Integration Icons
-- Use reliable icon sources: clearbit logo API, simpleicons, or Unicode emojis
-- Created: 2026-01-18

-- Clearbit Logo API format: https://logo.clearbit.com/{domain}
-- This is a reliable way to get company logos

-- PAYMENT GATEWAYS
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/payfast.co.za' WHERE slug = 'payfast';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/yoco.com' WHERE slug = 'yoco';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/snapscan.co.za' WHERE slug = 'snapscan';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/ozow.com' WHERE slug = 'ozow';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/peachpayments.com' WHERE slug = 'peach-payments';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/stitch.money' WHERE slug = 'stitch';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/iveri.com' WHERE slug = 'iveri';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/payu.co.za' WHERE slug = 'payu-sa';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/zapper.com' WHERE slug = 'zapper';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/mastercard.com' WHERE slug = 'masterpass-sa';

-- E-COMMERCE & MARKETPLACES
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/takealot.com' WHERE slug = 'takealot';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/bobshop.co.za' WHERE slug = 'bob-shop';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/makro.co.za' WHERE slug = 'makro';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/checkers.co.za' WHERE slug = 'checkers-sixty60';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/woolworths.co.za' WHERE slug = 'woolworths-dash';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/superbalist.com' WHERE slug = 'superbalist';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/bidorbuy.co.za' WHERE slug = 'bidorbuy';

-- SHIPPING & LOGISTICS
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/thecourierguy.co.za' WHERE slug = 'courier-guy';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/pargo.co.za' WHERE slug = 'pargo';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/uafrica.com' WHERE slug = 'uafrica';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/shiplogic.com' WHERE slug = 'shiplogic';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/fastway.co.za' WHERE slug = 'fastway';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/dawnwing.co.za' WHERE slug = 'dawn-wing';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/aramex.com' WHERE slug = 'aramex-sa';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/postnet.co.za' WHERE slug = 'postnet';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/paxi.co.za' WHERE slug = 'paxi';

-- ACCOUNTING & BUSINESS
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/sage.com' WHERE slug = 'pastel';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/sage.com' WHERE slug = 'sageone';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/sage.com' WHERE slug = 'sage-sa';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/draftworx.com' WHERE slug = 'draftworx';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/simplepay.co.za' WHERE slug = 'simplypay';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/payspace.com' WHERE slug = 'payspace';

-- FOOD & RESTAURANT
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/ubereats.com' WHERE slug = 'ubereats-sa';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/mrdfood.com' WHERE slug = 'mr-delivery';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/bolt.eu' WHERE slug = 'bolt-food';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/yumbi.com' WHERE slug = 'yumbi';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/pilot.co.za' WHERE slug = 'pilot';

-- BOOKING & TRAVEL
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/travelstart.co.za' WHERE slug = 'travelstart';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/lekkeslaap.co.za' WHERE slug = 'lekkeslaap';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/safarinow.com' WHERE slug = 'safarinow';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/nightsbridge.com' WHERE slug = 'nightsbridge';

-- COMMUNICATIONS
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/clickatell.com' WHERE slug = 'clickatell';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/bulksms.com' WHERE slug = 'bulksms';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/everlytic.com' WHERE slug = 'everlytic';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/grapevine.co.za' WHERE slug = 'grapevine';

-- RIDE-HAILING
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/uber.com' WHERE slug = 'uber-sa';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/bolt.eu' WHERE slug = 'bolt-rides';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/indrive.com' WHERE slug = 'indriver-sa';

-- BANKING & FINTECH
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/fnb.co.za' WHERE slug = 'fnb-api';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/nedbank.co.za' WHERE slug = 'nedbank-api';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/investec.com' WHERE slug = 'investec-api';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/tymebank.co.za' WHERE slug = 'tymebank';
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/discovery.co.za' WHERE slug = 'discovery-vitality';

-- iCal - use Apple iCloud icon
UPDATE integration_marketplace SET icon_url = 'https://logo.clearbit.com/apple.com' WHERE slug = 'ical-sync';

-- Show results
SELECT slug, name, icon_url
FROM integration_marketplace
WHERE icon_url LIKE 'https://logo.clearbit.com/%'
ORDER BY name;
