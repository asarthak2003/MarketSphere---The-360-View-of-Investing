document.addEventListener("DOMContentLoaded", () => {
  const stockGrid = document.getElementById("stock-grid-container");
  const searchInput = document.getElementById("stock-search-input");
  const searchButton = document.getElementById("stock-search-button");


  // Helper: Show error message
  function showError(message) {
    stockGrid.innerHTML = `
      <div style="text-align: center; padding: 40px; background: var(--bg-white); border-radius: 12px; border: 1px solid #ffb74d;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff9800;"></i>
        <p style="margin-top: 20px; color: var(--text-dark); font-weight: 600; font-size: 1.1rem;">${message}</p>
        <p style="margin-top: 10px; color: var(--text-light); font-size: 0.95rem;">Try popular symbols like: <strong>AAPL, MSFT, GOOG, TSLA, AMZN</strong></p>
      </div>
    `;
  }

  // Helper: Create stock card
  function createStockCard(stock) {
    const card = document.createElement("div");
    card.className = "stock-card";
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    
    const isPositive = (stock.change || 0) >= 0;
    const changeClass = isPositive ? '' : 'negative';
    const changePrefix = isPositive ? '+' : '';
    const formattedPrice = (stock.price || 0).toFixed(2);
    const formattedChange = (stock.change || 0).toFixed(2);
    const formattedChangePercent = (stock.changePercent || 0).toFixed(2);

    card.innerHTML = `
      <div class="stock-card-header">
        <h3>${stock.symbol}</h3>
        <span>US Stock</span>
      </div>
      <div class="stock-card-price">
        <span class="price">$${formattedPrice}</span>
        <span class="change ${changeClass}">
          ${changePrefix}$${formattedChange} (${changePrefix}${formattedChangePercent}%)
        </span>
        <div class="last-updated">Last updated: ${new Date().toLocaleTimeString()}</div>
      </div>
      <div class="stock-card-stats">
        <div class="stat-item">Open <span>$${(stock.open || 0).toFixed(2)}</span></div>
        <div class="stat-item">High <span>$${(stock.high || 0).toFixed(2)}</span></div>
        <div class="stat-item">Low <span>$${(stock.low || 0).toFixed(2)}</span></div>
        <div class="stat-item">Prev. Close <span>$${(stock.previousClose || 0).toFixed(2)}</span></div>
        <div class="stat-item">Volume <span>${(stock.volume || 0).toLocaleString()}</span></div>
      </div>
      <div class="stock-card-actions">
        <a href="#" class="btn btn-buy">Buy</a>
        <a href="#" class="btn btn-sell">Sell</a>
        <a href="#" class="btn btn-outline">Chart</a>
      </div>
    `;
    
    // Fade in animation
    setTimeout(() => {
      card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 10);
    
    return card;
  }
  
  // Main search function
  const fetchStockData = async () => {
    const symbol = searchInput.value.trim().toUpperCase();
    
    if (!symbol) {
      ErrorHandler.handleWarning("Please enter a stock symbol");
      showError("Please enter a stock symbol.");
      return;
    }

    // Validate symbol format
    if (!/^[A-Z0-9]+$/.test(symbol)) {
      ErrorHandler.handleWarning("Invalid symbol format");
      showError("Symbol must contain only letters and numbers.");
      return;
    }

    // Disable button during search
    searchButton.disabled = true;
    searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    

    try {
      const response = await fetch(`/api/v1/stock/search?symbol=${symbol}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Stock not found");
      }
      
      const result = await response.json();
      const stockData = result.data;
      
      // Clear and show result
      stockGrid.innerHTML = "";
      stockGrid.appendChild(createStockCard(stockData));
      
      ErrorHandler.handleSuccess(`${symbol} data loaded successfully`);

    } catch (error) {
      console.error("Error fetching stock data:", error);
      ErrorHandler.handleAPIError(error, `Failed to fetch ${symbol} data`);
      showError(error.message || "Failed to fetch stock data. Please try again.");
    } finally {
      searchButton.disabled = false;
      searchButton.innerHTML = 'Search';
    }
  };

  // Event listeners
  searchButton.addEventListener("click", fetchStockData);
  
  searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      fetchStockData();
    }
  });

  // Clear results when input is cleared
  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim() === "") {
      stockGrid.innerHTML = "";
    }
  });

  // Focus on input when page loads
  searchInput.focus();
});