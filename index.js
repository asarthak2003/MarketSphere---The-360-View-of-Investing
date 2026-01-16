// ============================================
// IPO WEB APP & REST API - 
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const { body, query, param, validationResult } = require('express-validator');
const ipoService = require('./services/ipoService');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CORS CONFIGURATION
// ============================================
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'https://your-domain.com',
      'https://www.your-domain.com',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost'
    ];
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));

// ============================================
// RATE LIMITING
// ============================================
const rateLimit = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const limit = 100;
  const windowMs = 60000;
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  const userData = rateLimit.get(ip);
  
  if (now > userData.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  if (userData.count >= limit) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again in 1 minute.',
      retryAfter: Math.ceil((userData.resetTime - now) / 1000)
    });
  }
  
  userData.count++;
  next();
}

// Cleanup rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimit.entries()) {
    if (now > data.resetTime) {
      rateLimit.delete(ip);
    }
  }
}, 300000);

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());

// Caching Headers
app.use((req, res, next) => {
  if (req.url.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Expires', new Date(Date.now() + 86400000).toUTCString());
  } else if (req.url.startsWith('/api/v1/')) {
    res.set('Cache-Control', 'public, max-age=300');
  } else if (req.url.match(/\.html$/) || req.url === '/') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to all API routes
app.use('/api', rateLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// VALIDATION HELPER
// ============================================
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

// ============================================
// IN-MEMORY DATABASE
// ============================================
let database = {
  brokers: [],
  funds: [],
  sectors: [],
  stockSchool: [],
  users: [],
};

// ============================================
// LOAD INITIAL DATA
// ============================================
async function loadInitialData() {
  try {
    const files = ['brokers', 'funds', 'sectors', 'stock-school'];
    let loadedCount = 0;
    let failedFiles = [];

    for (const file of files) {
      try {
        const filePath = path.join(__dirname, 'public', 'data', `${file}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        
        // Parse JSON with error handling
        try {
          const parsedData = JSON.parse(data);
          const dbKey = file === 'stock-school' ? 'stockSchool' : file;
          database[dbKey] = parsedData;
          loadedCount++;
          if (process.env.NODE_ENV !== 'test') {
             console.log(`✅ Loaded ${file}.json`);
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse ${file}.json:`, parseError.message);
          failedFiles.push(file);
          // Set empty fallback
          const dbKey = file === 'stock-school' ? 'stockSchool' : file;
          database[dbKey] = file === 'stock-school' ? {} : [];
        }
      } catch (readError) {
        console.error(`❌ Failed to read ${file}.json:`, readError.message);
        failedFiles.push(file);
        // Set empty fallback
        const dbKey = file === 'stock-school' ? 'stockSchool' : file;
        database[dbKey] = file === 'stock-school' ? {} : [];
      }
    }

    if (failedFiles.length > 0) {
      console.warn(`⚠️ Failed to load: ${failedFiles.join(', ')}`);
      console.warn('⚠️ Server will continue with partial data');
    }
    
    if (process.env.NODE_ENV !== 'test') {
      console.log(`✅ Database initialized (${loadedCount}/${files.length} files loaded)`);
    }

  } catch (error) {
    console.error('❌ Critical error during database initialization:', error);
    throw error; // This will prevent server from starting if critical error
  }
}

// ============================================
// API VERSIONING: v1
// ============================================
const API_V1 = '/api/v1';

// ============================================
// IPO ENDPOINTS
// ============================================

// GET all IPOs (paginated with validation)
app.get(`${API_V1}/ipos`, 
  query('status').optional().isIn(['ongoing', 'upcoming', 'listed', 'all']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status = 'all', page = 1, limit = 10 } = req.query;
      
      // Fetch IPOs by status from service
      const ipos = await ipoService.getIPOsByStatus(status);

      // Pagination logic
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedData = ipos.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedData,
        pagination: {
          total: ipos.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(ipos.length / limit)
        }
      });
    } catch (error) {
      console.error('Error in /ipos endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch IPO data'
      });
    }
  }
);

// Search IPOs - MUST BE BEFORE /:name route
app.get(`${API_V1}/ipos/search`,
  query('q').optional().trim().isLength({ min: 2, max: 100 }),
  query('minPrice').optional().isInt({ min: 0 }),
  query('maxPrice').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { q, minPrice, maxPrice } = req.query;
      
      // Get all IPOs
      let allIpos = await ipoService.getIPOsByStatus('all');
      
      // Filter by name
      if (q) {
        allIpos = allIpos.filter(ipo => 
          ipo.name.toLowerCase().includes(q.toLowerCase())
        );
      }
      
      // Filter by price
      if (minPrice || maxPrice) {
        allIpos = allIpos.filter(ipo => {
          const priceMatch = ipo.details.find(d => d.label === 'PRICE BAND' || d.label === 'IPO PRICE');
          if (!priceMatch) return false;
          
          // Handles both "Rs 218 - 230" and just "Rs 331"
          const prices = priceMatch.value.match(/\d+/g);
          if (!prices) return false;
          
          const avgPrice = (prices.length > 1) 
            ? (parseInt(prices[0]) + parseInt(prices[1])) / 2
            : parseInt(prices[0]);
          
          if (minPrice && avgPrice < parseInt(minPrice)) return false;
          if (maxPrice && avgPrice > parseInt(maxPrice)) return false;
          
          return true;
        });
      }
      
      res.json({ 
        success: true, 
        data: allIpos, 
        count: allIpos.length 
      });
    } catch (error) {
      console.error('Error in /ipos/search endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search IPOs'
      });
    }
  }
);

// GET single IPO by name
app.get(`${API_V1}/ipos/:name`, 
  param('name').notEmpty().trim(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.params;
      
      // Get all IPOs and search
      const allIpos = await ipoService.getIPOsByStatus('all');
      
      const ipo = allIpos.find(i => 
        i.name.toLowerCase().replace(/\s+/g, '-') === name.toLowerCase()
      );
      
      if (!ipo) {
        return res.status(404).json({
          success: false,
          error: 'IPO not found'
        });
      }
      
      res.json({
        success: true,
        data: ipo
      });
    } catch (error) {
      console.error('Error in /ipos/:name endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch IPO data'
      });
    }
  }
);


// ============================================
// BROKERS API
// ============================================
app.get(`${API_V1}/brokers`,
  query('rating').optional().isFloat({ min: 0, max: 5 }),
  query('sortBy').optional().isIn(['name', 'rating', 'accounts']),
  handleValidationErrors,
  (req, res) => {
    try {
      const { rating, sortBy = 'name' } = req.query;
      
      let brokers = [...database.brokers];
      
      if (rating) {
        brokers = brokers.filter(b => parseFloat(b.rating) >= parseFloat(rating));
      }
      
      if (sortBy === 'rating') {
        brokers.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      } else if (sortBy === 'accounts') {
        brokers.sort((a, b) => {
          const aNum = parseFloat(a.accounts.replace(/[^0-9.]/g, ''));
          const bNum = parseFloat(b.accounts.replace(/[^0-9.]/g, ''));
          return bNum - aNum;
        });
      }
      
      res.json({
        success: true,
        data: brokers,
        count: brokers.length
      });
    } catch (error) {
      console.error('Error in /brokers endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch brokers'
      });
    }
  }
);

// ============================================
// MUTUAL FUNDS API
// ============================================
app.get(`${API_V1}/funds`,
  query('category').optional().trim(),
  handleValidationErrors,
  (req, res) => {
    try {
      const { category } = req.query;
      
      let funds = [...database.funds];
      
      if (category) {
        funds = funds.filter(f => 
          f.category.toLowerCase().includes(category.toLowerCase())
        );
      }
      
      res.json({
        success: true,
        data: funds,
        count: funds.length
      });
    } catch (error) {
      console.error('Error in /funds endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch funds'
      });
    }
  }
);

// ============================================
// SECTORS API
// ============================================
app.get(`${API_V1}/sectors`, (req, res) => {
  try {
    res.json({
      success: true,
      data: database.sectors,
      count: database.sectors.length
    });
  } catch (error) {
    console.error('Error in /sectors endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sectors'
    });
  }
});

// ============================================
// STOCK SCHOOL API
// ============================================
app.get(`${API_V1}/stock-school`, (req, res) => {
  try {
    res.json({
      success: true,
      data: database.stockSchool
    });
  } catch (error) {
    console.error('Error in /stock-school endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock school data'
    });
  }
});

// ============================================
// STOCK SEARCH API (ALPHA VANTAGE)
// ============================================
app.get(`${API_V1}/stock/search`,
  query('symbol')
    .notEmpty().withMessage('Stock symbol is required')
    .trim()
    .isLength({ min: 1, max: 10 }).withMessage('Invalid stock symbol')
    .matches(/^[A-Z0-9]+$/i).withMessage('Symbol must contain only letters and numbers'),
  handleValidationErrors,
  async (req, res) => {
    const symbol = req.query.symbol.toUpperCase();

    try {
      const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;
      
      if (!ALPHA_VANTAGE_KEY) {
        console.error('❌ ALPHA_VANTAGE_KEY not found in environment variables');
        return res.status(500).json({
          success: false,
          error: 'API configuration error'
        });
      }

      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
      
      const response = await axios.get(url, {
        timeout: 10000 // 10 second timeout
      });
      
      const quote = response.data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        return res.status(404).json({
          success: false,
          error: `Stock "${symbol}" not found`
        });
      }

      const stockData = {
        symbol: symbol,
        price: parseFloat(quote['05. price']) || 0,
        change: parseFloat(quote['09. change']) || 0,
        changePercent: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
        open: parseFloat(quote['02. open']) || 0,
        high: parseFloat(quote['03. high']) || 0,
        low: parseFloat(quote['04. low']) || 0,
        volume: parseInt(quote['06. volume']) || 0,
        previousClose: parseFloat(quote['08. previous close']) || 0
      };

      res.json({
        success: true,
        data: stockData
      });

    } catch (error) {
      console.error('Stock search error:', error.message);
      
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          error: 'Request timeout. Please try again.'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stock data'
      });
    }
  }
);


// ============================================
// BACKWARD COMPATIBILITY
// ============================================
app.get('/api/ipos', (req, res) => res.redirect(301, `${API_V1}/ipos`));
app.get('/api/brokers', (req, res) => res.redirect(301, `${API_V1}/brokers`));
app.get('/api/funds', (req, res) => res.redirect(301, `${API_V1}/funds`));
app.get('/api/sectors', (req, res) => res.redirect(301, `${API_V1}/sectors`));
app.get('/api/stock-school', (req, res) => res.redirect(301, `${API_V1}/stock-school`));
app.get('/api/module-1', async (req, res) => {
  try {
    const data = await fs.readFile(
      path.join(__dirname, 'public', 'data', 'module-1.json'),
      'utf-8'
    );
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error loading module-1:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load module'
    });
  }
});
app.get('/api/stock-search', (req, res) => {
  res.redirect(301, `${API_V1}/stock/search?symbol=${req.query.symbol || ''}`);
});

// ============================================
// WEB ROUTES
// ============================================
app.get('*', (req, res) => {
  if (req.path === '/') {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  
  const potentialFile = req.path.endsWith('.html') ? req.path : `${req.path}.html`;
  const filePath = path.join(__dirname, 'public', potentialFile);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy: Access denied'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// ============================================
// START SERVER
// ============================================
loadInitialData().then(() => {
  // Only start the server if not in 'test' environment
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 MarketSphere - The 360° View of Investing - SERVER RUNNING');
      console.log('='.repeat(60));
      console.log(`🌐 Web App: http://localhost:${PORT}`);
      console.log(`📊 Sample API: http://localhost:${PORT}${API_V1}/ipos?status=ongoing`);
      console.log(`🔍 Stock Search: http://localhost:${PORT}${API_V1}/stock/search?symbol=AAPL`);
      console.log(`🔒 Rate Limit: 100 requests/minute per IP`);
      console.log(`⚡ Caching: Enabled for static assets & API`);
      console.log(`📦 Database: ${Object.keys(database).length} collections loaded`);
      console.log('='.repeat(60) + '\n');
    });
  }
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Export the app and loadInitialData for testing
module.exports = { app, loadInitialData };