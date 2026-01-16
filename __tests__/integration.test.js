// This file contains INTEGRATION TESTS.
// It tests the LIVE API endpoints of your actual server.

const request = require('supertest');
const { app, loadInitialData } = require('../index'); // Import the REAL app
const axios = require('axios');

// Mock external dependencies (axios for Alpha Vantage)
jest.mock('axios');

describe('API Integration Tests', () => {

  // Before all tests, load the static data just like the real server
  beforeAll(async () => {
    await loadInitialData();
  });

  // ============================================
  // Static Data Endpoints
  // ============================================
  
  describe('GET /api/v1/brokers', () => {
    test('should return 200 OK and broker data', async () => {
      const response = await request(app).get('/api/v1/brokers');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe('Upstox');
    });

    test('should filter by rating', async () => {
      const response = await request(app).get('/api/v1/brokers?rating=5.0');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Zerodha');
    });
  });

  describe('GET /api/v1/funds', () => {
    test('should return 200 OK and funds data', async () => {
      const response = await request(app).get('/api/v1/funds');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe('COMPANY Bluechip Fund');
    });
  });

  describe('GET /api/v1/sectors', () => {
    test('should return 200 OK and sectors data', async () => {
      const response = await request(app).get('/api/v1/sectors');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe('Agriculture');
    });
  });

  describe('GET /api/v1/stock-school', () => {
    test('should return 200 OK and stock school data', async () => {
      const response = await request(app).get('/api/v1/stock-school');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('level1');
      expect(response.body.data.level1.length).toBeGreaterThan(0);
    });
  });
  
  // ============================================
  // External API Endpoints (Alpha Vantage)
  // ============================================

  describe('GET /api/v1/stock/search', () => {
    
    beforeEach(() => {
      axios.get.mockReset(); // Reset mock before each stock search test
    });

    test('should return 200 OK and stock data for a valid symbol', async () => {
      // Mock the successful Alpha Vantage response
      const mockQuote = {
        "Global Quote": {
          "05. price": "150.75",
          "09. change": "2.50",
          "10. change percent": "1.69%",
          "02. open": "148.00",
          "03. high": "151.00",
          "04. low": "147.50",
          "06. volume": "12345678",
          "08. previous close": "148.25"
        }
      };
      axios.get.mockResolvedValue({ data: mockQuote });
      
      const response = await request(app).get('/api/v1/stock/search?symbol=AAPL');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.price).toBe(150.75);
    });

    test('should return 400 Bad Request for a missing symbol', async () => {
      const response = await request(app).get('/api/v1/stock/search');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].msg).toBe('Stock symbol is required');
    });
    
    test('should return 400 Bad Request for an invalid symbol format', async () => {
      const response = await request(app).get('/api/v1/stock/search?symbol=AAPL@');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].msg).toBe('Symbol must contain only letters and numbers');
    });

    test('should return 404 Not Found for an empty quote response', async () => {
      // Mock an empty/invalid response from Alpha Vantage
      const mockQuote = { "Global Quote": {} };
      axios.get.mockResolvedValue({ data: mockQuote });
      
      const response = await request(app).get('/api/v1/stock/search?symbol=NOTFOUND');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Stock "NOTFOUND" not found');
    });

    test('should return 504 Gateway Timeout on axios timeout', async () => {
      // Mock axios throwing a timeout error
      axios.get.mockRejectedValue({ code: 'ECONNABORTED' });
      
      const response = await request(app).get('/api/v1/stock/search?symbol=TIMEOUT');
      
      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request timeout. Please try again.');
    });
  });

  // ============================================
  // Backward Compatibility
  // ============================================
  
  describe('Backward Compatibility Redirects', () => {
    test('should redirect /api/ipos to /api/v1/ipos', async () => {
      const response = await request(app).get('/api/ipos');
      expect(response.status).toBe(301); // 301 Moved Permanently
      expect(response.header.location).toBe('/api/v1/ipos');
    });
    
    test('should redirect /api/brokers to /api/v1/brokers', async () => {
      const response = await request(app).get('/api/brokers');
      expect(response.status).toBe(301);
      expect(response.header.location).toBe('/api/v1/brokers');
    });
    
    test('should redirect /api/stock-search to /api/v1/stock/search', async () => {
      const response = await request(app).get('/api/stock-search?symbol=TEST');
      expect(response.status).toBe(301);
      expect(response.header.location).toBe('/api/v1/stock/search?symbol=TEST');
    });
  });
});