document.addEventListener("DOMContentLoaded", () => {
  const sectorGrid = document.getElementById("sector-grid-container");
  

  function createSectorCard(sector) {
    const card = document.createElement("div");
    card.className = "sector-card";
    
    const totalCaps = Object.values(sector.marketCap).reduce((a, b) => a + b, 0);

    card.innerHTML = `
      <div class="icon">
        <i class="${sector.icon}"></i>
      </div>
      <h3>${sector.name}</h3>
      <p>${sector.description}</p>
      <a href="#" class="companies-link">${sector.companiesLink}</a>
      <div class="sector-card-stats">
        <div class="stat-item">Micro <span>${sector.marketCap.micro}</span></div>
        <div class="stat-item">Small <span>${sector.marketCap.small}</span></div>
        <div class="stat-item">Mid <span>${sector.marketCap.mid}</span></div>
        <div class="stat-item">Large <span>${sector.marketCap.large}</span></div>
      </div>
      <a href="#" class="btn btn-outline">View All (${totalCaps})</a>
    `;
    return card;
  }

  fetch("/api/v1/sectors")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(result => {
      const data = result.data || result;
      sectorGrid.innerHTML = "";
      data.forEach(sector => sectorGrid.appendChild(createSectorCard(sector)));
      ErrorHandler.handleSuccess(`Loaded ${data.length} sectors`);
      console.log(`✅ Loaded ${data.length} sectors`);
    })
    .catch(error => {
      console.error("Error fetching sector data:", error);
      ErrorHandler.handleAPIError(error, 'Could not load sector data');
      sectorGrid.innerHTML = "<p style='text-align: center; padding: 40px;'>Could not load sector data.</p>";
    });
});
