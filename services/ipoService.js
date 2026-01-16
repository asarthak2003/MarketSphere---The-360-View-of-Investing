// services/ipoService.js
// Real-time Indian IPO data scraper (Chittorgarh ONLY)

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class IPOService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 3600000; // 1 hour
  }
  
  // Standard headers for scraping
  getScrapeHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    };
  }
  
  // Helper: Parse date to determine status
  parseAndCategorizeIPO(openDate, closeDate, listingDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse dates (format: DD-MM-YYYY or similar)
    const parseDate = (dateStr) => {
      if (!dateStr || dateStr === 'Not Issued' || dateStr === '-') return null;
      
      // Try parsing common formats
      const parts = dateStr.split(/[-\/]/);
      if (parts.length === 3) {
        // Assume DD-MM-YYYY
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      }
      return null;
    };
    
    const open = parseDate(openDate);
    const close = parseDate(closeDate);
    const listing = parseDate(listingDate);
    
    // Determine status 
    if (listing && listing <= today) {
      return 'listed';
    } else if (open && close) {
      if (today >= open && today <= close) {
        return 'ongoing';
      } else if (today < open) {
        return 'upcoming';
      } else if (today > close && (!listing || listing > today)) {
        return 'upcoming'; // Closed but not listed yet
      }
    }
    return 'upcoming'; // Default for incomplete/future data  
  }
  
  // ==========================================
  // METHOD: Chittorgarh IPO API (Unofficial)
  // ==========================================
  async fetchFromChittorgarh() {
    try {
      const url = 'https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/';
      const headers = this.getScrapeHeaders();
      const response = await axios.get(url, { 
        headers,
        timeout: 10000 
      });
      const $ = cheerio.load(response.data);
      
      const ipos = {
        ongoing: [],
        upcoming: [],
        listed: []
      };
      
      // Selectors for the main IPO table
      $('table.table tbody tr').each((i, elem) => {
        const name = $(elem).find('td').eq(0).text().trim();
        const openDate = $(elem).find('td').eq(1).text().trim();
        const closeDate = $(elem).find('td').eq(2).text().trim();
        const listingDate = $(elem).find('td').eq(3).text().trim();
        const issueSize = $(elem).find('td').eq(4).text().trim();
        const issuePrice = $(elem).find('td').eq(5).text().trim();
        
        if (name && name !== 'Company Name' && openDate && closeDate) {
          // Categorize by status
          const status = this.parseAndCategorizeIPO(openDate, closeDate, listingDate);
          
          const ipoData = {
            logo: '', // Scraping doesn't provide a logo
            name: name,
            details: [
              { "label": "PRICE BAND", "value": issuePrice || "TBA" },
              { "label": "OPEN", "value": openDate },
              { "label": "CLOSE", "value": closeDate },
              { "label": "ISSUE SIZE", "value": issueSize },
              { "label": "ISSUE TYPE", "value": "Book Built" },
              { "label": "LISTING DATE", "value": listingDate || "TBA" }
            ],
            source: 'Chittorgarh'
          };
          
          // Add to appropriate category
          ipos[status].push(ipoData);
        }
      });

      if (ipos.ongoing.length === 0 && ipos.upcoming.length === 0 && ipos.listed.length === 0) {
        console.warn('⚠️ Chittorgarh scraper found no IPOs. The site structure may have changed.');
      } else {
        console.log(`✅ Scraped ${ipos.ongoing.length} ongoing, ${ipos.upcoming.length} upcoming, ${ipos.listed.length} listed IPOs`);
      }
      
      return ipos;
    } catch (error) {
      console.error('❌ Error fetching from Chittorgarh:', error.message);
      return { ongoing: [], upcoming: [], listed: [] }; // Return empty structure
    }
  }

  // ==========================================
  // METHOD: Fallback to static data
  // ==========================================
  async loadStaticIPOData() {
    try {
      const filePath = path.join(__dirname, '..', 'public', 'data', 'ipos.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      console.log('✅ Loaded static IPO data as fallback');
      return parsed;
    } catch (error) {
      console.error('❌ Error loading static IPO data:', error.message);
      return { ongoing: [], upcoming: [], listed: [] };
    }
  }

  // ==========================================
  // AGGREGATE DATA (Primary Method)
  // ==========================================
  async getAllIPOs() {
    const cacheKey = 'all-ipos';
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('✅ Serving cached IPO data');
        return cached.data;
      }
    }

    console.log('🔄 Fetching fresh IPO data...');
    
    // Try scraping first
    let scrapedData = await this.fetchFromChittorgarh();
    
    // If scraping fails or returns no data, use static fallback
    const hasData = scrapedData.ongoing.length > 0 || 
                    scrapedData.upcoming.length > 0 || 
                    scrapedData.listed.length > 0;
    
    let finalData;
    if (!hasData) {
      console.log('⚠️ Scraping returned no data, using static fallback');
      finalData = await this.loadStaticIPOData();
    } else {
      finalData = scrapedData;
    }

    // Cache the result
    this.cache.set(cacheKey, {
      data: finalData,
      timestamp: Date.now()
    });

    return finalData;
  }

  // ==========================================
  // GET IPOs by Status
  // ==========================================
  async getIPOsByStatus(status) {
    const allIPOs = await this.getAllIPOs();
    
    if (status === 'all') {
      return [...allIPOs.ongoing, ...allIPOs.upcoming, ...allIPOs.listed];
    }
    
    return allIPOs[status] || [];
  }

  // ==========================================
  // CLEAR CACHE (Admin function)
  // ==========================================
  clearCache() {
    this.cache.clear();
    console.log('✅ Cache cleared');
  }
}

module.exports = new IPOService();