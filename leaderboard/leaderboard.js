// Leaderboard Controller
class LeaderboardController {
    constructor() {
        this.currentUser = null;
        this.leaderboardData = [];
        this.currentFilter = 'all';
    }

    async init() {
        await this.checkAuth();
        await this.loadLeaderboard();
        this.setupTabFilters();
    }

    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = '../login/';
            return;
        }
        
        this.currentUser = session.user;
    }

    async loadLeaderboard() {
        try {
            this.leaderboardData = await ProgressModel.getAllStudentsWithPerformance();
            this.updateTabCounts();
            this.updateStatsSummary();
            this.renderLeaderboard();
        } catch (error) {
            console.error('Liderlik cədvəli yüklənə bilmədi:', error);
        }
    }

    setupTabFilters() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderLeaderboard();
            });
        });
    }

    updateTabCounts() {
        const counts = {
            all: this.leaderboardData.length,
            better: 0,
            good: 0,
            normal: 0,
            weak: 0,
            'very-weak': 0
        };

        this.leaderboardData.forEach(student => {
            counts[student.performance.level]++;
        });

        document.getElementById('countAll').textContent = counts.all;
        document.getElementById('countBetter').textContent = counts.better;
        document.getElementById('countGood').textContent = counts.good;
        document.getElementById('countNormal').textContent = counts.normal;
        document.getElementById('countWeak').textContent = counts.weak;
        document.getElementById('countVeryWeak').textContent = counts['very-weak'];
    }

    updateStatsSummary() {
        const counts = {
            better: 0,
            good: 0,
            normal: 0,
            weak: 0,
            'very-weak': 0
        };

        this.leaderboardData.forEach(student => {
            counts[student.performance.level]++;
        });

        document.getElementById('countBetterStat').textContent = counts.better;
        document.getElementById('countGoodStat').textContent = counts.good;
        document.getElementById('countNormalStat').textContent = counts.normal;
        document.getElementById('countWeakStat').textContent = counts.weak;
        document.getElementById('countVeryWeakStat').textContent = counts['very-weak'];
    }

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboardTableBody');
        
        let filteredData = this.leaderboardData;
        if (this.currentFilter !== 'all') {
            filteredData = this.leaderboardData.filter(
                student => student.performance.level === this.currentFilter
            );
        }

        if (filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Bu kateqoriyada tələbə tapılmadı</td></tr>';
            return;
        }

        // Get total modules count from ProgressModel (excluding Onboarding)
        const totalModules = ProgressModel.getLeaderboardModules().length;

        tbody.innerHTML = filteredData.map((student, index) => {
            const globalRank = this.leaderboardData.findIndex(s => s.ID === student.ID) + 1;
            const performanceRatio = student.performanceRatio.toFixed(0);
            const perf = student.performance;
            const monthsInProgram = student.monthsInProgram ? student.monthsInProgram.toFixed(1) : '0';
            const completedModules = student.completedModules || 0;
            
            // Progress bar shows performance ratio (capped at 150% for display)
            const progressBarWidth = Math.min(performanceRatio, 150) / 1.5;
            
            return `
                <tr class="leaderboard-row level-${perf.level}">
                    <td>
                        <span class="rank-badge rank-${globalRank <= 3 ? globalRank : 'other'}">${globalRank}</span>
                    </td>
                    <td>
                        <div class="student-cell">
                            <a href="../review/write/?id=${student.ID}" class="student-link">
                                <strong>${this.escapeHtml(student.FirstName + ' ' + student.LastName)}</strong>
                                <span class="link-icon">✏️</span>
                            </a>
                            <span class="student-email">${this.escapeHtml(student.Email)}</span>
                        </div>
                    </td>
                    <td><span class="cohort-badge">${this.escapeHtml(student.CohortName || '-')}</span></td>
                    <td>
                        <span class="time-badge">
                            <span class="time-icon">⏱️</span> ${monthsInProgram} ay
                        </span>
                    </td>
                    <td>
                        <span class="module-count">${completedModules}/${totalModules}</span>
                    </td>
                    <td>
                        <div class="progress-cell">
                            <div class="progress-bar-mini">
                                <div class="progress-fill-mini" style="width: ${progressBarWidth}%; background-color: ${perf.color}"></div>
                            </div>
                            <span class="progress-percent">${performanceRatio}%</span>
                        </div>
                    </td>
                    <td>
                        <span class="level-badge level-${perf.level}" style="background-color: ${perf.color}20; color: ${perf.color}; border: 1px solid ${perf.color}40;">
                            ${perf.icon} ${perf.label}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
