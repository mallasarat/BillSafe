// =============================================
//  GST BILL PARSER
//  Extracts Indian GST invoice data from text
// =============================================

const GSTParser = (() => {

  // GSTIN format: 2-digit state code + 10-char PAN + 1-digit entity + 1 'Z' + 1 check
  const GSTIN_REGEX = /\b[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/gi;

  // Date patterns common in Indian receipts (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD)
  const DATE_PATTERNS = [
    /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b/g,   // DD/MM/YYYY
    /\b(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})\b/g,   // YYYY-MM-DD (ISO)
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})\b/gi, // DD Mon YYYY
  ];

  const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };

  // Amount patterns — look for ₹ or Rs. followed by a number
  const AMOUNT_PATTERNS = [
    /(?:total|grand total|net amount|amount payable|bill amount|to pay)[^\d]*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
  ];

  // Store/retailer name hints
  const STORE_HINTS = {
    'flipkart': 'flipkart',
    'amazon': 'amazon',
    'myntra': 'myntra',
    'meesho': 'meesho',
    'zepto': 'zepto',
    'blinkit': 'blinkit',
    'instamart': 'swiggy-instamart',
    'swiggy': 'swiggy-instamart',
    'croma': 'croma',
    'reliance digital': 'reliance-digital',
    'vijay sales': 'vijay-sales',
    'samsung': 'samsung-store',
    'apple': 'apple-store',
    'nykaa': 'nykaa',
    'dmart': 'dmart',
    'd-mart': 'dmart',
    'bigbasket': 'bigbasket-bb-now',
    'big basket': 'bigbasket-bb-now',
    'ajio': 'ajio',
    'tata cliq': 'tata-cliq',
    'snapdeal': 'snapdeal',
    'h&m': 'h-and-m',
    'zara': 'zara',
    'max fashion': 'max-fashion',
    'westside': 'westside',
  };

  // GST tax line patterns
  const GST_PATTERNS = {
    cgst: /CGST\s*[@:@\s]*([0-9.]+)%?\s*[:\-]?\s*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    sgst: /SGST\s*[@:@\s]*([0-9.]+)%?\s*[:\-]?\s*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    igst: /IGST\s*[@:@\s]*([0-9.]+)%?\s*[:\-]?\s*₹?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
  };

  function extractGSTIN(text) {
    const matches = [...text.matchAll(GSTIN_REGEX)];
    return matches.length > 0 ? matches[0][0].toUpperCase() : null;
  }

  function extractDate(text) {
    // Try DD/MM/YYYY first (most common in India)
    const ddmmyyyy = /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b/g;
    let match = ddmmyyyy.exec(text);
    if (match) {
      const [, dd, mm, yyyy] = match;
      const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
        return d;
      }
    }

    // Try ISO YYYY-MM-DD
    const iso = /\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/g;
    match = iso.exec(text);
    if (match) {
      const [, yyyy, mm, dd] = match;
      const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
    }

    // Try DD Mon YYYY
    const monName = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})\b/gi;
    match = monName.exec(text);
    if (match) {
      const [, dd, mon, yyyy] = match;
      const mm = MONTHS[mon.toLowerCase().slice(0, 3)];
      const d = new Date(parseInt(yyyy), mm - 1, parseInt(dd));
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  function extractAmount(text) {
    // Prioritize "total" lines
    const totalPatterns = [
      /(?:grand\s+total|total\s+amount|net\s+amount|amount\s+payable|bill\s+amount|to\s+pay|payable)[^\n₹Rs]*[₹Rs\.]+\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi,
    ];

    for (const pattern of totalPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const num = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }

    // Fallback: largest ₹ amount on page (likely total)
    const allAmounts = [];
    const rupeePattern = /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g;
    let m;
    while ((m = rupeePattern.exec(text)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) allAmounts.push(val);
    }
    const rsPattern = /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi;
    while ((m = rsPattern.exec(text)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) allAmounts.push(val);
    }

    if (allAmounts.length > 0) return Math.max(...allAmounts);
    return null;
  }

  function detectRetailer(text) {
    const lowerText = text.toLowerCase();
    for (const [hint, retailerId] of Object.entries(STORE_HINTS)) {
      if (lowerText.includes(hint)) {
        return retailerId;
      }
    }
    return null;
  }

  function extractGSTBreakdown(text) {
    const result = { cgst: null, sgst: null, igst: null };
    
    const cgstMatch = /CGST[^₹\d]*([0-9]+(?:\.[0-9]+)?)\s*%?[^₹\d]*(?:₹|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(text);
    if (cgstMatch) result.cgst = parseFloat(cgstMatch[2]?.replace(/,/g, '') || '0');
    
    const sgstMatch = /SGST[^₹\d]*([0-9]+(?:\.[0-9]+)?)\s*%?[^₹\d]*(?:₹|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(text);
    if (sgstMatch) result.sgst = parseFloat(sgstMatch[2]?.replace(/,/g, '') || '0');
    
    const igstMatch = /IGST[^₹\d]*([0-9]+(?:\.[0-9]+)?)\s*%?[^₹\d]*(?:₹|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(text);
    if (igstMatch) result.igst = parseFloat(igstMatch[2]?.replace(/,/g, '') || '0');

    return result;
  }

  function extractStoreName(text) {
    // First line is often the store name
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    if (lines.length > 0) {
      // Skip lines that look like dates or purely numeric
      for (const line of lines.slice(0, 5)) {
        if (!/^\d+$/.test(line) && !/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(line) && line.length < 60) {
          return line;
        }
      }
    }
    return null;
  }

  function parse(text) {
    if (!text || text.trim().length === 0) return {};

    const result = {
      gstin: extractGSTIN(text),
      date: extractDate(text),
      amount: extractAmount(text),
      retailerId: detectRetailer(text),
      storeName: extractStoreName(text),
      gstBreakdown: extractGSTBreakdown(text),
      rawText: text,
    };

    // If retailer detected, override store name with official name
    if (result.retailerId) {
      const retailer = getRetailerById(result.retailerId);
      if (retailer) result.detectedRetailerName = retailer.name;
    }

    return result;
  }

  return { parse, extractGSTIN, extractDate, extractAmount, detectRetailer };
})();
