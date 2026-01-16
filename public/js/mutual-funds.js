document.addEventListener("DOMContentLoaded", () => {
  const fundGrid = document.getElementById("fund-grid-container");
  
  function createFundCard(fund) {
    const card = document.createElement("div");
    card.className = "fund-card";

    const statsHtml = fund.stats.map(stat => {
      let valueClass = stat.isPositive ? "positive" : "";
      return `
        <div class="stat-item">
          ${stat.label}
          <span class="${valueClass}">${stat.value}</span>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <h3>${fund.name}</h3>
      <div class="fund-category">${fund.category}</div>
      <p>${fund.description}</p>
      <div class="fund-stats">
        ${statsHtml}
      </div>
      <div class="fund-card-actions">
        <a href="#" class="btn btn-primary">Invest Now</a>
        <a href="#" class="btn btn-outline">Details</a>
      </div>
    `;
    return card;
  }

  fetch("/api/v1/funds")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(result => {
      const data = result.data || result;
      fundGrid.innerHTML = "";
      data.forEach(fund => fundGrid.appendChild(createFundCard(fund)));
      ErrorHandler.handleSuccess(`Loaded ${data.length} mutual funds`);
      console.log(`✅ Loaded ${data.length} mutual funds`);
    })
    .catch(error => {
      console.error("Error fetching mutual fund data:", error);
      ErrorHandler.handleAPIError(error, 'Could not load mutual fund data');
      fundGrid.innerHTML = "<p style='text-align: center; padding: 40px;'>Could not load fund data.</p>";
    });
});
