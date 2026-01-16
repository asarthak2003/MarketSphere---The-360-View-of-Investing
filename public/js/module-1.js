document.addEventListener("DOMContentLoaded", () => {
  const articleContainer = document.getElementById("module-article-container");

  // Helper to convert JSON content to HTML
  function createHtmlFromContent(contentItem) {
    switch (contentItem.type) {
      case 'p':
        return `<p>${contentItem.text}</p>`;
      case 'h2':
        return `<h2>${contentItem.text}</h2>`;
      case 'ul':
        const listItemsUl = contentItem.items.map(item => `<li>${item}</li>`).join('');
        return `<ul>${listItemsUl}</ul>`;
      case 'ol':
        const listItemsOl = contentItem.items.map(item => `<li>${item}</li>`).join('');
        return `<ol>${listItemsOl}</ol>`;
      default:
        return '';
    }
  }

  // Fetch data from the API
  fetch("/api/module-1")
    .then(response => response.json())
    .then(data => {
      articleContainer.innerHTML = ""; // Clear loading message

      // Add Title
      const title = document.createElement("h1");
      title.textContent = data.title;
      articleContainer.appendChild(title);
      
      // Add Image with proper error handling
      const img = document.createElement("img");
      img.src = data.imageUrl;
      img.alt = data.title;
      img.style.width = "100%";
      img.style.borderRadius = "8px";
      img.style.marginBottom = "20px";
      
      img.addEventListener('error', function() {
      this.src = 'https://placehold.co/800x400/f9faff/377dff?text=Module+Image';
      });
      
      articleContainer.appendChild(img);

      // Add content
      const contentHtml = data.content.map(createHtmlFromContent).join('');
      articleContainer.innerHTML += contentHtml;
    })
    .catch(error => {
      ErrorHandler.handleAPIError(error, "Error fetching module data:");
      articleContainer.innerHTML = "<h1>Error</h1><p>Could not load module content.</p>";
    });
});
