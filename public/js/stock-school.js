document.addEventListener("DOMContentLoaded", () => {
  const level1Grid = document.getElementById("level-1-grid");
  const level2Grid = document.getElementById("level-2-grid");
  const level3Grid = document.getElementById("level-3-grid");
  const practicalGrid = document.getElementById("practical-grid");
  
  function createModuleCard(module) {
    const card = document.createElement("a");
    card.className = "module-card";
    card.href = module.link;

    card.innerHTML = `
      <div class="module-number">${module.moduleNumber}</div>
      <h3>${module.title}</h3>
      <p>${module.description}</p>
      <span class="btn btn-outline">Start Learning</span>
    `;
    return card;
  }

  fetch("/api/v1/stock-school")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(result => {
      const data = result.data || result;
      
      level1Grid.innerHTML = "";
      level2Grid.innerHTML = "";
      level3Grid.innerHTML = "";
      practicalGrid.innerHTML = "";

      data.level1.forEach(mod => level1Grid.appendChild(createModuleCard(mod)));
      data.level2.forEach(mod => level2Grid.appendChild(createModuleCard(mod)));
      data.level3.forEach(mod => level3Grid.appendChild(createModuleCard(mod)));
      data.practical.forEach(mod => practicalGrid.appendChild(createModuleCard(mod)));
      
      ErrorHandler.handleSuccess('Stock School modules loaded');
      console.log('✅ Loaded Stock School modules');
    })
    .catch(error => {
      console.error("Error fetching stock school data:", error);
      ErrorHandler.handleAPIError(error, 'Could not load modules');
      
      const errorMsg = "<p style='text-align: center; padding: 40px;'>Error loading modules.</p>";
      level1Grid.innerHTML = errorMsg;
      level2Grid.innerHTML = errorMsg;
      level3Grid.innerHTML = errorMsg;
      practicalGrid.innerHTML = errorMsg;
    });
});
