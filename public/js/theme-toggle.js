// Theme Toggle Functionality
// This script manages dark mode across all pages

(function() {
  // Get saved theme from localStorage or default to light
  const getCurrentTheme = () => localStorage.getItem('theme') || 'light';
  
  // Apply theme immediately (before page renders to prevent flash)
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  // Apply saved theme immediately
  applyTheme(getCurrentTheme());

  // Wait for DOM to load for the toggle button
  document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (!themeToggle) {
      console.warn('Theme toggle button not found');
      return;
    }

    // Toggle theme function
    const toggleTheme = () => {
      const currentTheme = getCurrentTheme();
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      // Save to localStorage
      localStorage.setItem('theme', newTheme);
      
      // Apply theme
      applyTheme(newTheme);
      
      // Optional: Add a subtle animation
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      
      console.log(`Theme switched to: ${newTheme}`);
    };

    // Add click event listener
    themeToggle.addEventListener('click', toggleTheme);
    
    // Optional: Keyboard accessibility (press 'd' for dark mode)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleTheme();
      }
    });
  });
})();