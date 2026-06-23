// =============================================
//  INDIAN RETAILER PRESETS DATABASE
//  BillSafe — India Edition
// =============================================

const RETAILERS = [
  // ─── Quick Commerce (CRITICAL - same day!) ───
  {
    id: 'zepto',
    name: 'Zepto',
    category: 'quick-commerce',
    returnDays: 1,
    warrantyMonths: 0,
    urgencyTier: 'critical',
    icon: '⚡',
    note: 'Raise return request before midnight same day'
  },
  {
    id: 'blinkit',
    name: 'Blinkit',
    category: 'quick-commerce',
    returnDays: 1,
    warrantyMonths: 0,
    urgencyTier: 'critical',
    icon: '⚡',
    note: 'Return within 24 hours of delivery'
  },
  {
    id: 'swiggy-instamart',
    name: 'Swiggy Instamart',
    category: 'quick-commerce',
    returnDays: 1,
    warrantyMonths: 0,
    urgencyTier: 'critical',
    icon: '⚡',
    note: 'Raise return via Swiggy app within 24 hours'
  },
  {
    id: 'bigbasket-bb-now',
    name: 'BB Now / BigBasket',
    category: 'quick-commerce',
    returnDays: 3,
    warrantyMonths: 0,
    urgencyTier: 'critical',
    icon: '🛒',
    note: 'Report issue within 3 days of delivery'
  },

  // ─── E-Commerce ───
  {
    id: 'flipkart',
    name: 'Flipkart',
    category: 'ecommerce',
    returnDays: 10,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '🛍️',
    note: '7 days electronics, 10 days apparel. Check product page for exact window.'
  },
  {
    id: 'amazon',
    name: 'Amazon India',
    category: 'ecommerce',
    returnDays: 10,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '📦',
    note: '10-30 days depending on category. Prime items may have extended returns.'
  },
  {
    id: 'meesho',
    name: 'Meesho',
    category: 'ecommerce',
    returnDays: 7,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '🎁',
    note: '7 days. Exchange only for most categories.'
  },
  {
    id: 'myntra',
    name: 'Myntra',
    category: 'ecommerce',
    returnDays: 30,
    warrantyMonths: 0,
    urgencyTier: 'soon',
    icon: '👗',
    note: '30 days for most clothing items. Some items are non-returnable.'
  },
  {
    id: 'ajio',
    name: 'AJIO',
    category: 'ecommerce',
    returnDays: 30,
    warrantyMonths: 0,
    urgencyTier: 'soon',
    icon: '👔',
    note: '30 days return window for apparel.'
  },
  {
    id: 'nykaa',
    name: 'Nykaa',
    category: 'ecommerce',
    returnDays: 15,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '💄',
    note: '15 days for most beauty products. Opened products non-returnable.'
  },
  {
    id: 'tata-cliq',
    name: 'Tata CLiQ',
    category: 'ecommerce',
    returnDays: 30,
    warrantyMonths: 0,
    urgencyTier: 'soon',
    icon: '🔷',
    note: '30 days return window. Electronics 7 days.'
  },
  {
    id: 'snapdeal',
    name: 'Snapdeal',
    category: 'ecommerce',
    returnDays: 7,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '🟠',
    note: '7 days return policy.'
  },

  // ─── Electronics & Appliances ───
  {
    id: 'croma',
    name: 'Croma',
    category: 'electronics',
    returnDays: 7,
    warrantyMonths: 12,
    urgencyTier: 'urgent',
    icon: '📺',
    note: '7 days return with original packaging. Brand warranty applicable.'
  },
  {
    id: 'reliance-digital',
    name: 'Reliance Digital',
    category: 'electronics',
    returnDays: 7,
    warrantyMonths: 12,
    urgencyTier: 'urgent',
    icon: '📱',
    note: '7 days return. ReliaCare extended warranty available.'
  },
  {
    id: 'vijay-sales',
    name: 'Vijay Sales',
    category: 'electronics',
    returnDays: 7,
    warrantyMonths: 12,
    urgencyTier: 'urgent',
    icon: '🖥️',
    note: '7 days return policy with invoice. Brand warranty included.'
  },
  {
    id: 'samsung-store',
    name: 'Samsung Store',
    category: 'electronics',
    returnDays: 7,
    warrantyMonths: 12,
    urgencyTier: 'urgent',
    icon: '📲',
    note: '7 days device return. 1 year brand warranty.'
  },
  {
    id: 'apple-store',
    name: 'Apple Store / Authorized Reseller',
    category: 'electronics',
    returnDays: 15,
    warrantyMonths: 12,
    urgencyTier: 'urgent',
    icon: '🍎',
    note: '15 days return. 1 year limited warranty + AppleCare option.'
  },

  // ─── Grocery & FMCG ───
  {
    id: 'dmart',
    name: 'DMart',
    category: 'grocery',
    returnDays: 3,
    warrantyMonths: 0,
    urgencyTier: 'critical',
    icon: '🏪',
    note: 'Limited return policy. FMCG items usually non-returnable.'
  },
  {
    id: 'reliance-fresh',
    name: 'Reliance Fresh / Smart',
    category: 'grocery',
    returnDays: 7,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '🥬',
    note: '7 days with original bill. Fresh produce non-returnable.'
  },

  // ─── Fashion & Lifestyle ───
  {
    id: 'h-and-m',
    name: 'H&M',
    category: 'clothing',
    returnDays: 30,
    warrantyMonths: 0,
    urgencyTier: 'soon',
    icon: '🛍️',
    note: '30 days return with tags attached.'
  },
  {
    id: 'zara',
    name: 'Zara',
    category: 'clothing',
    returnDays: 30,
    warrantyMonths: 0,
    urgencyTier: 'soon',
    icon: '👗',
    note: '30 days return policy.'
  },
  {
    id: 'max-fashion',
    name: 'Max Fashion',
    category: 'clothing',
    returnDays: 15,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '👕',
    note: '15 days exchange/return.'
  },
  {
    id: 'westside',
    name: 'Westside (Tata)',
    category: 'clothing',
    returnDays: 15,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '🧥',
    note: '15 days return with original tags and receipt.'
  },

  // ─── Local / Other ───
  {
    id: 'local-shop',
    name: 'Local / Kirana Shop',
    category: 'local',
    returnDays: 3,
    warrantyMonths: 0,
    urgencyTier: 'critical',
    icon: '🏬',
    note: 'Return policies vary. Act quickly, usually 0–3 days.'
  },
  {
    id: 'other',
    name: 'Other / Unknown',
    category: 'other',
    returnDays: 7,
    warrantyMonths: 0,
    urgencyTier: 'urgent',
    icon: '🏷️',
    note: 'Manually set your return window.'
  }
];

// Warranty presets by product category
const WARRANTY_PRESETS = {
  'smartphones': { months: 12, label: '1 Year', note: 'Brand warranty. Extended via brand app.' },
  'laptops': { months: 12, label: '1 Year', note: 'Extendable to 3 years.' },
  'ac': { months: 12, label: '1 Year Product + 5 Year Compressor', extra: 60, note: 'Track compressor warranty separately.' },
  'refrigerator': { months: 12, label: '1 Year Product + 5 Year Compressor', extra: 60 },
  'washing-machine': { months: 24, label: '2 Years Product + 5 Year Motor', extra: 60 },
  'tv': { months: 12, label: '1 Year Panel + 1 Year Parts' },
  'water-purifier': { months: 12, label: '1 Year + AMC recommended' },
  'pressure-cooker': { months: 60, label: 'ISI Lifetime Guarantee (5+ years)' },
  'microwave': { months: 12, label: '1 Year Warranty' },
  'clothing': { months: 0, label: 'No warranty' },
  'grocery': { months: 0, label: 'No warranty' }
};

function getRetailerById(id) {
  return RETAILERS.find(r => r.id === id) || null;
}

function getAllRetailers() {
  return RETAILERS;
}

function getRetailersByCategory(category) {
  return RETAILERS.filter(r => r.category === category);
}
