// Global Error Handler
// Centralized error handling and toast notifications

class ErrorHandler {
  static showToast(message, type = 'error') {
    // Remove existing toasts
    document.querySelectorAll('.toast-message').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    
    const icons = {
      error: 'exclamation-circle',
      success: 'check-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    
    const colors = {
      error: '#f44336',
      success: '#4caf50',
      warning: '#ff9800',
      info: '#2196f3'
    };
    
    toast.style.cssText = `
      position: fixed; 
      top: 20px; 
      right: 20px; 
      z-index: 9999;
      background: ${colors[type]};
      color: white; 
      padding: 16px 24px; 
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: 'Poppins', sans-serif;
      font-weight: 600;
      max-width: 400px;
      animation: slideIn 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    
    toast.innerHTML = `
      <i class="fas fa-${icons[type]}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
  
  static handleAPIError(error, customMessage = null) {
    console.error('API Error:', error);
    
    let message = customMessage || 'Something went wrong. Please try again.';
    
    // Handle specific errors
    if (error.message) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        message = '🌐 Network error. Check your internet connection.';
      } else if (error.message.includes('404')) {
        message = '🔍 Data not found. Please try again.';
      } else if (error.message.includes('429')) {
        message = '⏱️ Too many requests. Please wait a minute.';
      } else if (error.message.includes('500')) {
        message = '⚠️ Server error. Please try again later.';
      } else if (error.message.includes('403')) {
        message = '🚫 Access denied. Check permissions.';
      } else if (error.message.includes('401')) {
        message = '🔐 Authentication required. Please sign in.';
      }
    }
    
    this.showToast(message, 'error');
  }
  
  static handleSuccess(message) {
    this.showToast(message, 'success');
  }
  
  static handleWarning(message) {
    this.showToast(message, 'warning');
  }
  
  static handleInfo(message) {
    this.showToast(message, 'info');
  }
  
  // Confirm dialog
  static confirm(message, onConfirm, onCancel = null) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: var(--bg-white);
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      max-width: 400px;
      text-align: center;
    `;
    
    dialog.innerHTML = `
      <p style="font-size: 1.1rem; margin-bottom: 20px; color: var(--text-dark);">${message}</p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button class="btn btn-primary" id="confirm-yes">Yes</button>
        <button class="btn btn-outline" id="confirm-no">No</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    dialog.querySelector('#confirm-yes').onclick = () => {
      overlay.remove();
      if (onConfirm) onConfirm();
    };
    
    dialog.querySelector('#confirm-no').onclick = () => {
      overlay.remove();
      if (onCancel) onCancel();
    };
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        if (onCancel) onCancel();
      }
    };
  }
}

// Make it globally available
window.ErrorHandler = ErrorHandler;

// Global error handler for uncaught errors
window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.error);
  ErrorHandler.handleAPIError(e.error, 'An unexpected error occurred');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  ErrorHandler.handleAPIError(e.reason, 'An unexpected error occurred');
});

console.log('✅ Error Handler loaded');