// Dashboard Controller
class DashboardController {
    constructor() {
        this.currentUser = null;
        this.stats = null;
        this.reviewerStats = [];
    }

    async init() {
        await this.checkAuth();
        await this.loadStatistics();
        await this.loadReviewerStats();
        await this.loadRecentReviews();
        await this.checkPendingReviews();
    }

    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = '../login/';
            return;
        }
        
        this.currentUser = session.user;
    }

    async loadStatistics() {
        try {
            this.stats = await ReviewModel.getStatistics();
            
            document.getElementById('todayReviews').textContent = this.stats.today;
            document.getElementById('weekReviews').textContent = this.stats.thisWeek;
            document.getElementById('monthReviews').textContent = this.stats.thisMonth;
            document.getElementById('totalReviews').textContent = this.stats.total;
            
        } catch (error) {
            console.error('Statistika yüklənə bilmədi:', error);
        }
    }

    async loadReviewerStats() {
        try {
            this.reviewerStats = await ReviewModel.getReviewerStats();
            this.renderReviewersTable();
        } catch (error) {
            console.error('Reviewer statistikası yüklənə bilmədi:', error);
        }
    }

    renderReviewersTable() {
        const tbody = document.getElementById('reviewersTableBody');
        
        if (this.reviewerStats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Məlumat tapılmadı</td></tr>';
            return;
        }

        tbody.innerHTML = this.reviewerStats.map((reviewer, index) => {
            const todayBadge = reviewer.todayReviews > 0 
                ? `<span class="badge success">${reviewer.todayReviews}</span>`
                : `<span class="badge muted">0</span>`;
            
            return `
                <tr>
                    <td><span class="rank-badge rank-${index < 3 ? index + 1 : 'other'}">${index + 1}</span></td>
                    <td><strong>${this.escapeHtml(reviewer.name)}</strong></td>
                    <td>${todayBadge}</td>
                    <td><span class="badge primary">${reviewer.totalReviews}</span></td>
                </tr>
            `;
        }).join('');
    }

    async loadRecentReviews() {
        try {
            const reviews = await ReviewModel.getAllReviews();
            const recentReviews = reviews.slice(0, 10); // Last 10 reviews
            this.renderRecentReviews(recentReviews);
        } catch (error) {
            console.error('Son qiymətləndirmələr yüklənə bilmədi:', error);
        }
    }

    renderRecentReviews(reviews) {
        const container = document.getElementById('recentReviewsList');
        
        if (reviews.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280;">Qiymətləndirmə tapılmadı</p>';
            return;
        }

        container.innerHTML = reviews.map(review => {
            const reviewerName = review.Reviewer 
                ? `${review.Reviewer.FirstName} ${review.Reviewer.LastName}` 
                : 'Naməlum';
            const studentName = review.Student 
                ? `${review.Student.FirstName} ${review.Student.LastName}` 
                : 'Naməlum';
            const date = this.formatDateTime(new Date(review.WriteDate));
            
            return `
                <div class="recent-review-card">
                    <div class="review-meta">
                        <span class="reviewer-name">👤 ${this.escapeHtml(reviewerName)}</span>
                        <span class="review-arrow">→</span>
                        <span class="student-name">🎓 ${this.escapeHtml(studentName)}</span>
                    </div>
                    <div class="review-date">${date}</div>
                </div>
            `;
        }).join('');
    }

    async checkPendingReviews() {
        try {
            const allStudents = await StudentModel.getAll();
            const todayReviews = await ReviewModel.getTodayReviews();
            const reviewedIds = new Set(todayReviews.map(r => r.StudentID));
            
            const pendingCount = allStudents.filter(s => !reviewedIds.has(s.ID)).length;
            
            if (pendingCount > 0) {
                document.getElementById('pendingAlert').style.display = 'block';
                document.getElementById('pendingCount').textContent = pendingCount;
            }
        } catch (error) {
            console.error('Gözləyən qiymətləndirmələr yoxlanıla bilmədi:', error);
        }
    }

    formatDate(date) {
        return date.toLocaleDateString('az-AZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatDateTime(date) {
        return date.toLocaleDateString('az-AZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
