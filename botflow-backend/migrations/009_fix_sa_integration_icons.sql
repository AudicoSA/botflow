-- Migration 009: Fix South African Integration Icons
-- Replace local /integrations/*.png paths with proper web URLs or emojis
-- Created: 2026-01-18

-- PAYMENT GATEWAYS
UPDATE integration_marketplace SET icon_url = 'https://www.payfast.co.za/assets/images/payfast_logo_colour.svg' WHERE slug = 'payfast';
UPDATE integration_marketplace SET icon_url = 'https://yoco.co.za/icons/icon-512x512.png' WHERE slug = 'yoco';
UPDATE integration_marketplace SET icon_url = 'https://www.snapscan.co.za/images/logo.png' WHERE slug = 'snapscan';
UPDATE integration_marketplace SET icon_url = 'https://ozow.com/wp-content/uploads/2023/04/ozow-logo.png' WHERE slug = 'ozow';
UPDATE integration_marketplace SET icon_url = 'https://www.peachpayments.com/hubfs/peach-payments-logo.svg' WHERE slug = 'peach-payments';
UPDATE integration_marketplace SET icon_url = 'https://stitch.money/images/stitch-logo.svg' WHERE slug = 'stitch';
UPDATE integration_marketplace SET icon_url = 'https://www.iveri.com/images/iveri-logo.png' WHERE slug = 'iveri';
UPDATE integration_marketplace SET icon_url = 'https://corporate.payu.com/wp-content/uploads/2020/10/PayU_Logo_Vertical_RGB.png' WHERE slug = 'payu-sa';
UPDATE integration_marketplace SET icon_url = 'https://www.zapper.com/static/images/logo.svg' WHERE slug = 'zapper';
UPDATE integration_marketplace SET icon_url = 'https://www.mastercard.com/content/dam/public/mastercardcom/na/global-site/images/logos/mastercard-logo.svg' WHERE slug = 'masterpass-sa';

-- E-COMMERCE & MARKETPLACES
UPDATE integration_marketplace SET icon_url = 'https://www.takealot.com/static/images/logo.svg' WHERE slug = 'takealot';
UPDATE integration_marketplace SET icon_url = 'https://www.bobshop.co.za/images/logo.png' WHERE slug = 'bob-shop';
UPDATE integration_marketplace SET icon_url = 'https://www.makro.co.za/sys-master/images/logo.png' WHERE slug = 'makro';
UPDATE integration_marketplace SET icon_url = 'https://www.checkers.co.za/medias/Logo-Checkers-Sixty60.png' WHERE slug = 'checkers-sixty60';
UPDATE integration_marketplace SET icon_url = 'https://www.woolworths.co.za/images/ww-logo.svg' WHERE slug = 'woolworths-dash';
UPDATE integration_marketplace SET icon_url = 'https://superbalist.com/images/logo.svg' WHERE slug = 'superbalist';
UPDATE integration_marketplace SET icon_url = 'https://www.bidorbuy.co.za/images/logo.svg' WHERE slug = 'bidorbuy';

-- SHIPPING & LOGISTICS
UPDATE integration_marketplace SET icon_url = 'https://www.thecourierguy.co.za/wp-content/uploads/2021/03/tcg-logo.png' WHERE slug = 'courier-guy';
UPDATE integration_marketplace SET icon_url = 'https://www.pargo.co.za/wp-content/uploads/2021/08/pargo-logo.png' WHERE slug = 'pargo';
UPDATE integration_marketplace SET icon_url = 'https://www.uafrica.com/images/logo.png' WHERE slug = 'uafrica';
UPDATE integration_marketplace SET icon_url = 'https://www.shiplogic.com/images/logo.png' WHERE slug = 'shiplogic';
UPDATE integration_marketplace SET icon_url = 'https://www.fastway.co.za/images/logo.png' WHERE slug = 'fastway';
UPDATE integration_marketplace SET icon_url = 'https://www.dawnwing.co.za/wp-content/uploads/2020/04/dawnwing-logo.png' WHERE slug = 'dawn-wing';
UPDATE integration_marketplace SET icon_url = 'https://www.aramex.com/Aramex/media/Images/aramex-logo.png' WHERE slug = 'aramex-sa';
UPDATE integration_marketplace SET icon_url = 'https://www.postnet.co.za/images/postnet-logo.png' WHERE slug = 'postnet';
UPDATE integration_marketplace SET icon_url = 'https://www.paxi.co.za/images/paxi-logo.png' WHERE slug = 'paxi';

-- ACCOUNTING & BUSINESS
UPDATE integration_marketplace SET icon_url = 'https://www.sage.com/na/-/media/sage/logos/logo-sage.svg' WHERE slug = 'pastel';
UPDATE integration_marketplace SET icon_url = 'https://www.sage.com/na/-/media/sage/logos/logo-sage.svg' WHERE slug = 'sageone';
UPDATE integration_marketplace SET icon_url = 'https://www.sage.com/na/-/media/sage/logos/logo-sage.svg' WHERE slug = 'sage-sa';
UPDATE integration_marketplace SET icon_url = 'https://www.draftworx.com/images/logo.png' WHERE slug = 'draftworx';
UPDATE integration_marketplace SET icon_url = 'https://www.simplepay.co.za/images/logo.svg' WHERE slug = 'simplypay';
UPDATE integration_marketplace SET icon_url = 'https://www.payspace.com/wp-content/uploads/payspace-logo.png' WHERE slug = 'payspace';

-- FOOD & RESTAURANT
UPDATE integration_marketplace SET icon_url = 'https://d3i4yxtzktqr9n.cloudfront.net/web-eats-v2/ee037401cb5d31b23cf780808ee4ec1f.svg' WHERE slug = 'ubereats-sa';
UPDATE integration_marketplace SET icon_url = 'https://www.mrdfood.com/images/mrd-logo.png' WHERE slug = 'mr-delivery';
UPDATE integration_marketplace SET icon_url = 'https://food.bolt.eu/static/images/logo.svg' WHERE slug = 'bolt-food';
UPDATE integration_marketplace SET icon_url = 'https://www.yumbi.com/images/yumbi-logo.png' WHERE slug = 'yumbi';
UPDATE integration_marketplace SET icon_url = 'https://www.pilot.co.za/images/pilot-logo.png' WHERE slug = 'pilot';

-- BOOKING & TRAVEL
UPDATE integration_marketplace SET icon_url = 'https://www.travelstart.co.za/images/logo.svg' WHERE slug = 'travelstart';
UPDATE integration_marketplace SET icon_url = 'https://www.lekkeslaap.co.za/images/logo.png' WHERE slug = 'lekkeslaap';
UPDATE integration_marketplace SET icon_url = 'https://www.safarinow.com/images/logo.png' WHERE slug = 'safarinow';
UPDATE integration_marketplace SET icon_url = 'https://www.nightsbridge.com/images/nb-logo.png' WHERE slug = 'nightsbridge';

-- COMMUNICATIONS
UPDATE integration_marketplace SET icon_url = 'https://www.clickatell.com/wp-content/uploads/2020/10/clickatell-logo.svg' WHERE slug = 'clickatell';
UPDATE integration_marketplace SET icon_url = 'https://www.bulksms.com/images/bulksms-logo.png' WHERE slug = 'bulksms';
UPDATE integration_marketplace SET icon_url = 'https://www.everlytic.com/wp-content/uploads/2021/09/everlytic-logo.svg' WHERE slug = 'everlytic';
UPDATE integration_marketplace SET icon_url = 'https://www.grapevine.co.za/images/logo.png' WHERE slug = 'grapevine';

-- RIDE-HAILING
UPDATE integration_marketplace SET icon_url = 'https://www.uber.com/img/icons/uber-logo.svg' WHERE slug = 'uber-sa';
UPDATE integration_marketplace SET icon_url = 'https://bolt.eu/static/images/logo.svg' WHERE slug = 'bolt-rides';
UPDATE integration_marketplace SET icon_url = 'https://indrive.com/img/logo.svg' WHERE slug = 'indriver-sa';

-- BANKING & FINTECH
UPDATE integration_marketplace SET icon_url = 'https://www.fnb.co.za/images/fnb-logo.svg' WHERE slug = 'fnb-api';
UPDATE integration_marketplace SET icon_url = 'https://www.nedbank.co.za/content/dam/nedbank/site-assets/images/nedbank-logo.svg' WHERE slug = 'nedbank-api';
UPDATE integration_marketplace SET icon_url = 'https://www.investec.com/content/dam/investec/investec-logo.svg' WHERE slug = 'investec-api';
UPDATE integration_marketplace SET icon_url = 'https://www.tymebank.co.za/images/tyme-logo.svg' WHERE slug = 'tymebank';
UPDATE integration_marketplace SET icon_url = 'https://www.discovery.co.za/assets/images/discovery-logo.svg' WHERE slug = 'discovery-vitality';

-- iCal
UPDATE integration_marketplace SET icon_url = 'https://upload.wikimedia.org/wikipedia/commons/8/8c/ICloud_logo.svg' WHERE slug = 'ical-sync';

-- Show updated count
SELECT 'Updated ' || COUNT(*)::text || ' SA integration icons' as result
FROM integration_marketplace
WHERE icon_url NOT LIKE '/integrations/%';
