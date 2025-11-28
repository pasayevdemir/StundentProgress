// Settings Page Controller
class SettingsController {
    constructor() {
        this.geminiService = null;
    }

    async init() {
        await this.checkAuth();
        this.geminiService = new GeminiService();
        this.setupEventListeners();
        this.loadSavedApiKey();
        this.checkApiStatus();
    }

    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = '../login/';
            return;
        }
    }

    setupEventListeners() {
        // Toggle API key visibility
        document.getElementById('toggleApiKeyVisibility').addEventListener('click', () => {
            const input = document.getElementById('geminiApiKey');
            const btn = document.getElementById('toggleApiKeyVisibility');
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });

        // Save API key
        document.getElementById('saveApiKey').addEventListener('click', () => {
            this.saveApiKey();
        });

        // Test API key
        document.getElementById('testApiKey').addEventListener('click', () => {
            this.testApiKey();
        });

        // Delete API key
        document.getElementById('deleteApiKey').addEventListener('click', () => {
            this.deleteApiKey();
        });

        // Enter key to save
        document.getElementById('geminiApiKey').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });
    }

    loadSavedApiKey() {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            document.getElementById('geminiApiKey').value = savedKey;
        }
    }

    saveApiKey() {
        const apiKey = document.getElementById('geminiApiKey').value.trim();
        
        if (!apiKey) {
            this.showNotification('API açarı daxil edin', 'error');
            return;
        }

        localStorage.setItem('gemini_api_key', apiKey);
        this.geminiService.setApiKey(apiKey);
        this.showNotification('API açarı saxlanıldı');
        this.checkApiStatus();
    }

    async testApiKey() {
        const apiKey = document.getElementById('geminiApiKey').value.trim();
        
        if (!apiKey) {
            this.showNotification('API açarı daxil edin', 'error');
            return;
        }

        this.updateStatus('Yoxlanılır...', 'warning');
        
        try {
            this.geminiService.setApiKey(apiKey);
            const result = await this.geminiService.testConnection();
            
            if (result.success) {
                this.updateStatus('API açarı işləyir!', 'success');
                this.showNotification('API açarı uğurla yoxlanıldı!');
                this.showAvailableModels(result.availableModels);
            } else {
                this.updateStatus(`Xəta: ${result.error}`, 'error');
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.updateStatus('Bağlantı xətası', 'error');
            this.showNotification('API yoxlanılarkən xəta baş verdi', 'error');
        }
    }

    deleteApiKey() {
        localStorage.removeItem('gemini_api_key');
        document.getElementById('geminiApiKey').value = '';
        this.geminiService.setApiKey(null);
        this.updateStatus('API açarı silindi', 'warning');
        this.showNotification('API açarı silindi');
        document.getElementById('modelInfo').style.display = 'none';
    }

    checkApiStatus() {
        const savedKey = localStorage.getItem('gemini_api_key');
        
        if (savedKey) {
            this.updateStatus('API açarı mövcuddur', 'success');
        } else {
            this.updateStatus('API açarı təyin edilməyib', 'warning');
        }
    }

    updateStatus(message, type) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        statusDot.className = 'status-dot ' + type;
        statusText.textContent = message;
    }

    showAvailableModels(models) {
        const modelInfo = document.getElementById('modelInfo');
        const modelsList = document.getElementById('modelsList');
        
        modelInfo.style.display = 'block';
        modelsList.innerHTML = '';

        const allModels = [
            'gemini-2.5-pro',
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite'
        ];

        allModels.forEach(model => {
            const isAvailable = models.includes(model);
            const modelItem = document.createElement('div');
            modelItem.className = 'model-item';
            modelItem.innerHTML = `
                <span class="model-name">${model}</span>
                <span class="model-status ${isAvailable ? 'available' : 'unavailable'}">
                    ${isAvailable ? 'Mövcud' : 'Mövcud deyil'}
                </span>
            `;
            modelsList.appendChild(modelItem);
        });
    }

    showNotification(message, type = 'success') {
        const popup = document.getElementById('notificationPopup');
        const messageEl = document.getElementById('notificationMessage');
        const content = popup.querySelector('.notification-content');
        
        messageEl.textContent = message;
        content.className = 'notification-content' + (type === 'error' ? ' error' : '');
        
        popup.classList.remove('hidden');
        popup.classList.add('show');
        
        setTimeout(() => {
            popup.classList.remove('show');
        }, 3000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const settingsController = new SettingsController();
    settingsController.init();
});
