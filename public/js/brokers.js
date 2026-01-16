document.addEventListener("DOMContentLoaded", () => {
  const brokerList = document.getElementById("broker-list-container");

  let allBrokers = [];
  const ITEMS_PER_PAGE = 5;
  let currentPage = 1;
  let isLoading = false;

  // Helper to create star rating
  function createStars(starsArray) {
    if (!starsArray) return '';
    return starsArray.map(star => {
      if (star === true) return '<i class="fas fa-star"></i>';
      if (star === "half") return '<i class="fas fa-star-half-alt"></i>';
      return '<i class="far fa-star"></i>';
    }).join('');
  }

  // Helper to create a broker card
  function createBrokerCard(broker) {
    const card = document.createElement("div");
    card.className = "broker-card";
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";

    const starsHtml = createStars(broker.stars);
    const featuresHtml = broker.features.map(f => `
      <div class="broker-feature-item">
        <i class="fas fa-check-circle"></i> ${f}
      </div>
    `).join('');
    
    const chargesHtml = broker.charges.map(c => `
      <div class="broker-charge-item">
        <span>${c.label}</span>
        <span>${c.value}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="broker-info-left">
        <h3>${broker.name}</h3>
        <div class="rating">
          ${starsHtml}
          <span>${broker.rating} (${broker.reviews})</span>
        </div>
        <div class="broker-stats">
          <span>Accounts: <strong>${broker.accounts}</strong></span>
        </div>
        <div class="broker-tag">${broker.tag}</div>
        <div class="broker-actions">
          <a href="#" class="btn btn-primary">Open Account</a>
          <a href="#" class="btn btn-outline">Read Review</a>
        </div>
      </div>
      <div class="broker-features">
        ${featuresHtml}
      </div>
      <div class="broker-charges">
        ${chargesHtml}
      </div>
      <div class="broker-logo-container">
        <img src="${broker.logo}" alt="${broker.name} Logo" loading="lazy" onerror="this.src='https://placehold.co/100x80?text=Logo'">
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

  // Load brokers for current page
  function loadBrokers() {
    if (isLoading) return;
    
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const brokersToLoad = allBrokers.slice(start, end);
    
    if (brokersToLoad.length === 0) return;
    
    isLoading = true;
    
    // Show loading indicator
    const loader = document.createElement('div');
    loader.className = 'loading-indicator';
    loader.style.cssText = 'text-align: center; padding: 30px; color: var(--text-light); grid-column: 1 / -1;';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 10px;">Loading more brokers...</p>';
    brokerList.appendChild(loader);
    
    setTimeout(() => {
      brokersToLoad.forEach(broker => {
        brokerList.insertBefore(createBrokerCard(broker), loader);
      });
      
      loader.remove();
      isLoading = false;
      currentPage++;
      
      if (end >= allBrokers.length) {
        const endMessage = document.createElement('div');
        endMessage.style.cssText = 'text-align: center; padding: 20px; color: var(--text-light); grid-column: 1 / -1;';
        endMessage.innerHTML = '<p>✅ All brokers loaded</p>';
        brokerList.appendChild(endMessage);
      }
      
      console.log(`Loaded page ${currentPage - 1} (${brokersToLoad.length} brokers)`);
    }, 500);
  }

  // Setup infinite scroll
  function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.offsetHeight - 300;
      
      if (scrollPosition >= threshold && !isLoading) {
        const remainingBrokers = allBrokers.length - (currentPage * ITEMS_PER_PAGE);
        if (remainingBrokers > 0 || (currentPage * ITEMS_PER_PAGE === allBrokers.length)) {
          loadBrokers();
        }
      }
    });
  }

  // Fetch data from the API
  fetch("/api/v1/brokers")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(result => {
      allBrokers = result.data || result;
      
      // Load first page
      loadBrokers();
      
      // Setup infinite scroll
      setupInfiniteScroll();
      
      ErrorHandler.handleSuccess(`Loaded ${allBrokers.length} brokers`);
      console.log(`✅ Loaded ${allBrokers.length} brokers with infinite scroll`);
    })
    .catch(error => {
      console.error("Error fetching broker data:", error);
      ErrorHandler.handleAPIError(error, 'Could not load broker data');
      brokerList.innerHTML = "<p style='text-align: center; padding: 40px; color: var(--text-light);'>Could not load broker data. Please refresh the page.</p>";
    });
});