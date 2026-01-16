document.addEventListener("DOMContentLoaded", () => {
  const ongoingGrid = document.getElementById("ongoing-ipos-grid");
  const upcomingGrid = document.getElementById("upcoming-ipos-grid");
  const listedGrid = document.getElementById("listed-ipos-grid");

  // Track loaded data for stats
  let loadedCounts = {
    ongoing: 0,
    upcoming: 0,
    listed: 0
  };

  // Helper to create a single detail item with improved formatting
  function createDetailItem(label, value) {
    let valueHtml = value;
    
    // Color code gains/losses
    if (label === "LISTING GAIN" || label === "CURRENT RETURN") {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const isPositive = numValue >= 0;
        const icon = isPositive ? '▲' : '▼';
        valueHtml = `<span style="color: ${isPositive ? '#2e7d32' : '#c62828'}; font-weight: 600;">${icon} ${value}</span>`;
      }
    }
    
    // Highlight important dates
    if (label === "CLOSE" || label === "LISTING DATE") {
      const date = new Date(value);
      const today = new Date();
      const daysLeft = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      
      if (daysLeft >= 0 && daysLeft <= 3) {
        valueHtml = `<span style="color: #ff6b6b; font-weight: 600;">${value} 🔥</span>`;
      }
    }
    
    return `
      <div class="detail-item">
        ${label}
        <span>${valueHtml}</span>
      </div>
    `;
  }

  // Helper to create an Ongoing/Upcoming IPO card with badge
  function createUpcomingCard(ipo, isOngoing = false) {
    const card = document.createElement("div");
    card.className = "ipo-card";
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    
    // Add status badge
    const badge = isOngoing 
      ? '<span style="position: absolute; top: 15px; right: 15px; background: #ff6b6b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">LIVE NOW</span>'
      : '<span style="position: absolute; top: 15px; right: 15px; background: #4dabf7; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">UPCOMING</span>';
    
    let detailsHtml = ipo.details.map(detail => createDetailItem(detail.label, detail.value)).join('');
    const logoUrl = ipo.logo || 'https://placehold.co/50x50?text=IPO';

    card.innerHTML = `
      <div style="position: relative;">
        ${badge}
        <div class="ipo-card-header">
          <img src="${logoUrl}" alt="${ipo.name} Logo" loading="lazy" onerror="this.src='https://placehold.co/50x50?text=Logo'">
          <h3>${ipo.name}</h3>
        </div>
        <div class="ipo-card-details">
          ${detailsHtml}
        </div>
        <div class="ipo-card-links">
          <a href="#" class="btn btn-primary">Apply Now</a>
          <a href="#" class="btn btn-outline">Details</a>
        </div>
      </div>
    `;
    
    // Stagger animation
    setTimeout(() => {
      card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 10);
    
    return card;
  }

  // Helper to create a Listed IPO card with performance indicator
  function createListedCard(ipo) {
    const card = document.createElement("div");
    card.className = "ipo-card";
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    
    // Extract performance data
    const currentReturn = ipo.details.find(d => d.label === "CURRENT RETURN");
    const returnValue = currentReturn ? parseFloat(currentReturn.value) : 0;
    
    // Performance badge
    let performanceBadge = '';
    if (!isNaN(returnValue)) {
      if (returnValue >= 20) {
        performanceBadge = '<span style="position: absolute; top: 15px; right: 15px; background: #2e7d32; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">🚀 TOP GAINER</span>';
      } else if (returnValue < 0) {
        performanceBadge = '<span style="position: absolute; top: 15px; right: 15px; background: #d32f2f; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">⚠️ LOSS</span>';
      }
    }
    
    let detailsHtml = ipo.details.map(detail => createDetailItem(detail.label, detail.value)).join('');
    const logoUrl = ipo.logo || 'https://placehold.co/50x50?text=IPO';

    card.innerHTML = `
      <div style="position: relative;">
        ${performanceBadge}
        <div class="ipo-card-header">
          <img src="${logoUrl}" alt="${ipo.name} Logo" loading="lazy" onerror="this.src='https://placehold.co/50x50?text=Logo'">
          <h3>${ipo.name}</h3>
        </div>
        <div class="ipo-card-details">
          ${detailsHtml}
        </div>
        <div class="ipo-card-links">
          <a href="#" class="btn btn-outline">View Details</a>
        </div>
      </div>
    `;
    
    setTimeout(() => {
      card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 10);
    
    return card;
  }

  // Improved loading spinner
  function showLoading(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 40px; grid-column: 1/-1;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary-purple);"></i>
        <p style="margin-top: 20px; color: var(--text-light); font-size: 1rem;">Fetching latest IPO data...</p>
      </div>
    `;
  }

  // Improved empty state
  function showEmptyState(container, message, icon = "inbox") {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 40px; grid-column: 1/-1; background: var(--bg-white); border-radius: 12px; border: 2px dashed var(--border-color);">
        <i class="fas fa-${icon}" style="font-size: 3.5rem; color: var(--text-light); margin-bottom: 20px; opacity: 0.6;"></i>
        <p style="color: var(--text-dark); font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">${message}</p>
        <p style="color: var(--text-light); font-size: 0.9rem;">Check back soon for new opportunities</p>
      </div>
    `;
  }

  // Show summary stats after all data loads
  function showSummaryStats() {
    const total = loadedCounts.ongoing + loadedCounts.upcoming + loadedCounts.listed;
    console.log(`📊 IPO Summary: ${loadedCounts.ongoing} Ongoing | ${loadedCounts.upcoming} Upcoming | ${loadedCounts.listed} Listed | Total: ${total}`);
    
    if (total > 0) {
      ErrorHandler.handleSuccess(`Loaded ${total} IPOs successfully`);
    }
  }

  // Fetch ongoing IPOs (DYNAMIC)
  showLoading(ongoingGrid);
  fetch("/api/v1/ipos?status=ongoing")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(result => {
      const data = result.data || [];
      ongoingGrid.innerHTML = "";
      loadedCounts.ongoing = data.length;
      
      if (data.length === 0) {
        showEmptyState(ongoingGrid, "No ongoing IPOs at the moment", "calendar-times");
      } else {
        data.forEach(ipo => ongoingGrid.appendChild(createUpcomingCard(ipo, true)));
        console.log(`✅ Loaded ${data.length} ongoing IPOs`);
      }
      
      showSummaryStats();
    })
    .catch(error => {
      console.error("Error fetching ongoing IPO data:", error);
      ErrorHandler.handleAPIError(error, 'Could not load ongoing IPOs');
      showEmptyState(ongoingGrid, "Failed to load data. Please refresh.", "exclamation-triangle");
    });

  // Fetch upcoming IPOs (DYNAMIC)
  showLoading(upcomingGrid);
  fetch("/api/v1/ipos?status=upcoming")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(result => {
      const data = result.data || [];
      upcomingGrid.innerHTML = "";
      loadedCounts.upcoming = data.length;
      
      if (data.length === 0) {
        showEmptyState(upcomingGrid, "No upcoming IPOs at the moment", "calendar-check");
      } else {
        data.forEach(ipo => upcomingGrid.appendChild(createUpcomingCard(ipo, false)));
        console.log(`✅ Loaded ${data.length} upcoming IPOs`);
      }
      
      showSummaryStats();
    })
    .catch(error => {
      console.error("Error fetching upcoming IPO data:", error);
      ErrorHandler.handleAPIError(error, 'Could not load upcoming IPOs');
      showEmptyState(upcomingGrid, "Failed to load data. Please refresh.", "exclamation-triangle");
    });

  // Fetch listed IPOs (STATIC from ipos.json)
  showLoading(listedGrid);
  fetch("/data/ipos.json")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      const listedIPOs = data.listed || [];
      listedGrid.innerHTML = "";
      loadedCounts.listed = listedIPOs.length;
      
      if (listedIPOs.length === 0) {
        showEmptyState(listedGrid, "No listed IPOs available", "list");
      } else {
        listedIPOs.forEach(ipo => listedGrid.appendChild(createListedCard(ipo)));
        console.log(`✅ Loaded ${listedIPOs.length} listed IPOs (static)`);
      }
      
      showSummaryStats();
    })
    .catch(error => {
      console.error("Error fetching listed IPO data:", error);
      ErrorHandler.handleAPIError(error, 'Could not load listed IPOs');
      showEmptyState(listedGrid, "Failed to load data. Please refresh.", "exclamation-triangle");
    });
});