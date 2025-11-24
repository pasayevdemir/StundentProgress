// UI Helper Utilities
class UIHelper {
    static showNotification(message, type = 'success') {
        const notification = document.getElementById('notificationPopup');
        const messageEl = document.getElementById('notificationMessage');
        
        if (!notification || !messageEl) return;
        
        messageEl.textContent = message;
        notification.className = `notification-popup show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    static showLoader(show = true) {
        let loader = document.getElementById('globalLoader');
        
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.className = 'global-loader';
            loader.innerHTML = '<div class="loader-spinner"></div><p>Yüklənir...</p>';
            document.body.appendChild(loader);
        }
        
        loader.style.display = show ? 'flex' : 'none';
    }
    
    static formatDate(dateString) {
        return new Date(dateString).toLocaleString('az-AZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
