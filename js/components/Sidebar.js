// Sidebar Component - Modular hamburger menu
class Sidebar {
    constructor() {
        this.isOpen = false;
        this.currentPath = window.location.pathname;
        this.isDesktop = window.innerWidth > 1024;
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.applyTheme();
        
        // Open sidebar by default on desktop
        if (this.isDesktop) {
            this.openDesktop();
        }
    }

    getBasePath() {
        // Determine base path based on current location
        if (this.currentPath.includes('/review/write/')) {
            return '../../';
        } else if (this.currentPath.includes('/review/') || this.currentPath.includes('/login/') || this.currentPath.includes('/dashboard/') || this.currentPath.includes('/leaderboard/')) {
            return '../';
        }
        return './';
    }

    getMenuItems() {
        const basePath = this.getBasePath();
        return [
            {
                id: 'dashboard',
                icon: '📊',
                label: 'Ana Səhifə',
                path: `${basePath}dashboard/`,
                active: this.currentPath.includes('/dashboard/')
            },
            {
                id: 'students',
                icon: '👥',
                label: 'Tələbələr',
                path: `${basePath}review/`,
                active: this.currentPath.includes('/review/')
            },
            {
                id: 'leaderboard',
                icon: '🏆',
                label: 'Liderlik Cədvəli',
                path: `${basePath}leaderboard/`,
                active: this.currentPath.includes('/leaderboard/')
            },
            {
                id: 'settings',
                icon: '⚙️',
                label: 'Tənzimləmələr',
                path: '#',
                active: false,
                disabled: true
            }
        ];
    }

    render() {
        const basePath = this.getBasePath();
        const themeIcon = this.isDarkMode ? '☀️' : '🌙';
        const themeLabel = this.isDarkMode ? 'Açıq Tema' : 'Qaranlıq Tema';
        
        // Create sidebar HTML
        const sidebarHTML = `
            <!-- Hamburger Button -->
            <button class="hamburger-btn" id="hamburgerBtn" aria-label="Menu">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>

            <!-- Sidebar Overlay -->
            <div class="sidebar-overlay" id="sidebarOverlay"></div>

            <!-- Sidebar -->
            <nav class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">
                        <span class="logo-icon">🎓</span>
                        <span class="logo-text">PeerStack</span>
                    </div>
                    <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">×</button>
                </div>

                <div class="sidebar-menu">
                    ${this.getMenuItems().map(item => `
                        <a href="${item.path}" 
                           class="sidebar-item ${item.active ? 'active' : ''} ${item.disabled ? 'disabled' : ''}"
                           ${item.disabled ? 'onclick="return false;"' : ''}>
                            <span class="sidebar-icon">${item.icon}</span>
                            <span class="sidebar-label">${item.label}</span>
                        </a>
                    `).join('')}
                    
                    <div class="sidebar-divider"></div>
                    
                    <button class="sidebar-item theme-toggle" id="themeToggle">
                        <span class="sidebar-icon" id="themeIcon">${themeIcon}</span>
                        <span class="sidebar-label" id="themeLabel">${themeLabel}</span>
                    </button>
                </div>

                <div class="sidebar-footer">
                    <div class="sidebar-user-row">
                        <div class="sidebar-user" id="sidebarUser">
                            <span class="user-avatar">👤</span>
                            <span class="user-name" id="sidebarUserName">Yüklənir...</span>
                        </div>
                        <button class="sidebar-logout-btn" onclick="sidebar.logout()" title="Çıxış">
                            🚪
                        </button>
                    </div>
                </div>
            </nav>
        `;

        // Insert at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    }

    setupEventListeners() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sidebarClose = document.getElementById('sidebarClose');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const themeToggle = document.getElementById('themeToggle');

        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', () => this.toggle());
        }

        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => this.close());
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => this.close());
        }
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const wasDesktop = this.isDesktop;
            this.isDesktop = window.innerWidth > 1024;
            
            if (this.isDesktop && !wasDesktop) {
                this.openDesktop();
            } else if (!this.isDesktop && wasDesktop) {
                this.close();
            }
        });

        // Load user info
        this.loadUserInfo();
    }

    toggle() {
        if (this.isDesktop) {
            this.isOpen ? this.closeDesktop() : this.openDesktop();
        } else {
            this.isOpen ? this.close() : this.open();
        }
    }

    open() {
        this.isOpen = true;
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
        document.getElementById('hamburgerBtn').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen = false;
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar').classList.remove('desktop-open');
        document.getElementById('sidebarOverlay').classList.remove('active');
        document.getElementById('hamburgerBtn').classList.remove('active');
        document.body.style.overflow = '';
        document.body.classList.remove('sidebar-expanded');
    }
    
    openDesktop() {
        this.isOpen = true;
        document.getElementById('sidebar').classList.add('desktop-open');
        document.getElementById('hamburgerBtn').classList.add('active');
        document.body.classList.add('sidebar-expanded');
    }
    
    closeDesktop() {
        this.isOpen = false;
        document.getElementById('sidebar').classList.remove('desktop-open');
        document.getElementById('hamburgerBtn').classList.remove('active');
        document.body.classList.remove('sidebar-expanded');
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', this.isDarkMode);
        this.applyTheme();
        this.updateThemeButton();
    }
    
    applyTheme() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }
    
    updateThemeButton() {
        const themeIcon = document.getElementById('themeIcon');
        const themeLabel = document.getElementById('themeLabel');
        
        if (themeIcon && themeLabel) {
            themeIcon.textContent = this.isDarkMode ? '☀️' : '🌙';
            themeLabel.textContent = this.isDarkMode ? 'Açıq Tema' : 'Qaranlıq Tema';
        }
    }

    async loadUserInfo() {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                const userName = document.getElementById('sidebarUserName');
                if (userName) {
                    userName.textContent = session.user.email || 'İstifadəçi';
                }
            }
        } catch (error) {
            console.error('User info yüklənə bilmədi:', error);
        }
    }

    async logout() {
        try {
            await supabaseClient.auth.signOut();
            const basePath = this.getBasePath();
            window.location.href = `${basePath}login/`;
        } catch (error) {
            console.error('Çıxış xətası:', error);
        }
    }
}

// Global sidebar instance
let sidebar;

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    sidebar = new Sidebar();
    sidebar.init();
});
