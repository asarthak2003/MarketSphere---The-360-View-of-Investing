document.addEventListener('DOMContentLoaded', function() {
  // 1. Check if the 'loginStatus' flag exists in session storage
  const status = sessionStorage.getItem('loginStatus');
  
  if (status === 'success') {
    const messageElement = document.getElementById('success-message');
    if (messageElement) {
      // 2. Show the message
      messageElement.classList.add('show');
      
      // 3. Remove the flag so it doesn't show again on refresh
      sessionStorage.removeItem('loginStatus');
      
      // 4. Hide the message again after 3 seconds
      setTimeout(function() {
        messageElement.classList.remove('show');
      }, 3000);
    }
  }
});