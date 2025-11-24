// Student Detail Controller
class StudentDetailController {
    constructor(studentId) {
        this.studentId = studentId;
        this.student = null;
        this.currentUser = null;
        this.reviewerId = null;
        this.latestProgress = null;
        this.previousProgress = null;
    }
    
    async init() {
        await this.checkAuth();
        await this.getReviewerId();
        await this.loadStudentData();
        await this.loadProgressData();
        await this.loadReviews();
        this.setupForm();
    }
    
    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = session.user;
    }
    
    async getReviewerId() {
        this.reviewerId = await ReviewerModel.getStudentIdByAuthId(this.currentUser.id);
    }
    
    async loadStudentData() {
        try {
            this.student = await StudentModel.getById(this.studentId);
            this.renderStudentInfo();
        } catch (error) {
            console.error('Tələbə məlumatı yüklənə bilmədi:', error);
            UIHelper.showNotification('Tələbə tapılmadı', 'error');
            setTimeout(() => window.location.href = 'review.html', 1500);
        }
    }
    
    async loadProgressData() {
        try {
            // Get latest progress by ProgressDate (not CreatedAt)
            this.latestProgress = await ProgressModel.getLatestByProgressDate(this.studentId);
            
            if (!this.latestProgress || !this.latestProgress.ProgressDate) {
                this.renderProgress();
                return;
            }
            
            // Get ProgressDate of latest record
            const latestDate = new Date(this.latestProgress.ProgressDate);
            
            // Calculate 1 week before
            const oneWeekBefore = new Date(latestDate);
            oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
            
            // Find progress closest to 1 week before latest ProgressDate
            this.previousProgress = await ProgressModel.getProgressByDate(
                this.studentId, 
                oneWeekBefore.toISOString().split('T')[0]
            );
            
            // If no exact match, find the closest one before that date
            if (!this.previousProgress) {
                this.previousProgress = await ProgressModel.getClosestProgressBeforeDate(
                    this.studentId,
                    oneWeekBefore.toISOString().split('T')[0]
                );
            }
            
            this.renderProgress();
        } catch (error) {
            console.error('Progress yüklənə bilmədi:', error);
        }
    }
    
    async loadReviews() {
        try {
            const reviews = await ReviewModel.getLastWeekReviews(this.studentId);
            this.renderReviews(reviews);
        } catch (error) {
            console.error('Qiymətləndirmələr yüklənə bilmədi:', error);
        }
    }
    
    renderStudentInfo() {
        document.getElementById('studentName').textContent = `${this.student.FirstName} ${this.student.LastName}`;
        document.getElementById('studentEmail').textContent = this.student.Email;
        document.getElementById('studentCohort').textContent = this.student.CohortName;
        document.getElementById('studentStatus').textContent = this.student.Status ? 'Aktiv' : 'Pasiv';
    }
    
    renderProgress() {
        const container = document.getElementById('modulesGrid');
        const subtitle = document.querySelector('.section-subtitle');
        
        if (!container) return;
        
        if (!this.latestProgress) {
            container.innerHTML = '<p style="color: #999;">Progress məlumatı tapılmadı</p>';
            return;
        }
        
        // Update subtitle with dates
        if (subtitle && this.latestProgress.ProgressDate) {
            const latestDate = new Date(this.latestProgress.ProgressDate).toLocaleDateString('az-AZ');
            const previousDate = this.previousProgress && this.previousProgress.ProgressDate
                ? new Date(this.previousProgress.ProgressDate).toLocaleDateString('az-AZ')
                : 'başlanğıc';
            
            subtitle.textContent = `Progress müqayisəsi: ${previousDate} → ${latestDate}`;
        }
        
        const differences = this.previousProgress 
            ? ProgressModel.calculateDifference(this.latestProgress, this.previousProgress)
            : {};
        
        let html = '';
        
        MODULE_COLUMNS.forEach(module => {
            const progress = this.latestProgress[module];
            
            if (progress !== null && progress !== undefined) {
                const diff = differences[module];
                const progressPercent = Math.min(Math.max(progress, 0), 100);
                
                // Get previous percent - treat NULL as 0 if we're comparing
                let previousPercent = null;
                if (this.previousProgress) {
                    const prevValue = this.previousProgress[module];
                    if (prevValue !== null && prevValue !== undefined) {
                        previousPercent = Math.min(Math.max(prevValue, 0), 100);
                    } else if (diff) {
                        // If there's a diff shown, previous was 0 (NULL treated as starting point)
                        previousPercent = 0;
                    }
                }
                
                html += `
                    <div class="module-card ${diff ? 'has-change' : ''}">
                        <div class="module-name">${module}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">${progressPercent}%</div>
                        ${diff && diff.difference > 0 ? `
                            <div class="progress-change positive">
                                ${previousPercent !== null ? `${previousPercent}% → ${progressPercent}%` : `${progressPercent}%`}
                                <span style="font-weight: bold; margin-left: 0.5rem;">
                                    (+${diff.difference}%)
                                </span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        });
        
        container.innerHTML = html || '<p style="color: #999;">Aktiv modul tapılmadı</p>';
    }
    
    renderReviews(reviews) {
        const container = document.getElementById('reviewsList');
        if (!container) return;
        
        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<div class="no-reviews">Son bir həftədə qiymətləndirmə yazılmamış</div>';
            return;
        }
        
        container.innerHTML = reviews.map(review => {
            const reviewerName = review.Students 
                ? `${review.Students.FirstName} ${review.Students.LastName}` 
                : 'Bilinmir';
            
            return `
                <div class="review-card">
                    <div class="review-date">${UIHelper.formatDate(review.WriteDate)}</div>
                    <div class="review-reviewer">Qiymətləndirən: ${UIHelper.escapeHtml(reviewerName)}</div>
                    <div class="review-content">
                        <div class="review-item">
                            <div class="review-label">Bu günə kimi öyrəndi:</div>
                            <div class="review-text">${UIHelper.escapeHtml(review.UntilToday)}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">Bu gün edəcəkdir:</div>
                            <div class="review-text">${UIHelper.escapeHtml(review.Today)}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">Qiymətləndirici fikri:</div>
                            <div class="review-text">${UIHelper.escapeHtml(review.ReviewerFeedback)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    setupForm() {
        const form = document.getElementById('reviewForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitReview();
        });
    }
    
    async submitReview() {
        if (!this.reviewerId) {
            UIHelper.showNotification('Qiymətləndirən məlumatı tapılmadı', 'error');
            return;
        }
        
        const learned = document.getElementById('learned').value;
        const today = document.getElementById('today').value;
        const feedback = document.getElementById('feedback').value;
        
        try {
            await ReviewModel.create({
                ReviewerID: this.reviewerId,
                StudentID: this.studentId,
                WriteDate: new Date().toISOString(),
                UntilToday: learned,
                Today: today,
                ReviewerFeedback: feedback
            });
            
            document.getElementById('reviewForm').reset();
            await this.loadReviews();
            await this.loadProgressData(); // Reload to get new comparison
            
            UIHelper.showNotification('Qiymətləndirmə uğurla saxlanıldı!', 'success');
        } catch (error) {
            console.error('Qiymətləndirmə saxlana bilmədi:', error);
            UIHelper.showNotification('Xəta: ' + error.message, 'error');
        }
    }
    
    goBack() {
        window.location.href = 'review.html';
    }
}
