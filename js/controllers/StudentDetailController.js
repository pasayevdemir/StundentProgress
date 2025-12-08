// Student Detail Controller
class StudentDetailController {
    constructor(studentId) {
        this.studentId = studentId;
        this.student = null;
        this.currentUser = null;
        this.reviewerId = null;
        this.latestProgress = null;
        this.previousProgress = null;
        this.geminiService = null;
        this.currentAiField = null;
        this.currentAiText = null;
        this.selectedDays = 7; // Default to weekly
    }
    
    async init() {
        await this.checkAuth();
        await this.getReviewerId();
        await this.loadStudentData();
        await this.loadProgressData();
        await this.loadReviews();
        this.setupForm();
        this.setupAI();
        this.setupDateSelector();
    }
    
    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = '../../login/';
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
            setTimeout(() => window.location.href = '../', 1500);
        }
    }
    
    async loadProgressData(days = null) {
        try {
            // Use provided days or default
            const daysToCompare = days !== null ? days : this.selectedDays;
            
            // Get latest progress by ProgressDate (not CreatedAt)
            this.latestProgress = await ProgressModel.getLatestByProgressDate(this.studentId);
            
            if (!this.latestProgress || !this.latestProgress.ProgressDate) {
                this.renderProgress();
                return;
            }
            
            // Get ProgressDate of latest record
            const latestDate = new Date(this.latestProgress.ProgressDate);
            
            // Calculate date based on selected days
            const targetDate = new Date(latestDate);
            targetDate.setDate(targetDate.getDate() - daysToCompare);
            
            // Find progress closest to target date
            this.previousProgress = await ProgressModel.getProgressByDate(
                this.studentId, 
                targetDate.toISOString().split('T')[0]
            );
            
            // If no exact match, find the closest one before that date
            if (!this.previousProgress) {
                this.previousProgress = await ProgressModel.getClosestProgressBeforeDate(
                    this.studentId,
                    targetDate.toISOString().split('T')[0]
                );
            }
            
            this.renderProgress();
        } catch (error) {
            console.error('Progress yüklənə bilmədi:', error);
        }
    }
    
    async loadProgressByCustomDate(targetDateStr) {
        try {
            // Get latest progress by ProgressDate (current/today's progress)
            this.latestProgress = await ProgressModel.getLatestByProgressDate(this.studentId);
            
            if (!this.latestProgress || !this.latestProgress.ProgressDate) {
                this.renderProgress();
                return;
            }
            
            // Find progress for the selected date (this becomes the "previous" for comparison)
            this.previousProgress = await ProgressModel.getProgressByDate(
                this.studentId, 
                targetDateStr
            );
            
            // If no exact match, try to find the closest one before that date
            if (!this.previousProgress) {
                this.previousProgress = await ProgressModel.getClosestProgressBeforeDate(
                    this.studentId,
                    targetDateStr
                );
            }
            
            // If still no progress found (selected date is before student started),
            // find the earliest progress (student's start date)
            if (!this.previousProgress) {
                this.previousProgress = await ProgressModel.getEarliestProgress(this.studentId);
            }
            
            // Update subtitle with actual date info
            const subtitle = document.querySelector('.section-subtitle');
            if (subtitle) {
                const latestDate = new Date(this.latestProgress.ProgressDate).toLocaleDateString('az-AZ');
                // Use the actual previous progress date if found, otherwise show selected date
                const previousDate = this.previousProgress && this.previousProgress.ProgressDate
                    ? new Date(this.previousProgress.ProgressDate).toLocaleDateString('az-AZ')
                    : new Date(targetDateStr).toLocaleDateString('az-AZ');
                subtitle.textContent = `Progress müqayisəsi: ${previousDate} → ${latestDate}`;
            }
            
            this.renderProgress();
        } catch (error) {
            console.error('Progress yüklənə bilmədi:', error);
        }
    }
    
    setupDateSelector() {
        // Setup date buttons
        const dateButtons = document.querySelectorAll('.date-btn');
        dateButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Update active state
                dateButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Clear custom date picker
                const customDatePicker = document.getElementById('customDate');
                if (customDatePicker) {
                    customDatePicker.value = '';
                }
                
                // Get days and reload progress
                const days = parseInt(e.target.dataset.days);
                this.selectedDays = days;
                await this.loadProgressData(days);
                
                // Update subtitle
                this.updateSubtitleText(days);
            });
        });
        
        // Setup custom date picker
        const customDatePicker = document.getElementById('customDate');
        if (customDatePicker) {
            // Set max date to today (prevent future dates)
            const today = new Date().toISOString().split('T')[0];
            customDatePicker.max = today;
            
            customDatePicker.addEventListener('change', async (e) => {
                const selectedDate = e.target.value;
                if (selectedDate) {
                    // Remove active state from buttons
                    dateButtons.forEach(b => b.classList.remove('active'));
                    
                    // Load progress comparing today to selected date
                    await this.loadProgressByCustomDate(selectedDate);
                }
            });
        }
    }
    
    updateSubtitleText(days) {
        const subtitle = document.querySelector('.section-subtitle');
        if (subtitle) {
            let periodText = '';
            if (days === 7) {
                periodText = 'Son 1 həftəlik';
            } else if (days === 10) {
                periodText = 'Son 10 günlük';
            } else if (days === 30) {
                periodText = 'Son 1 aylıq';
            } else {
                periodText = `Son ${days} günlük`;
            }
            subtitle.textContent = `${periodText} progress dəyişiklikləri göstərilir`;
        }
    }
    
    async loadReviews() {
        try {
            const reviews = await ReviewModel.getByStudentId(this.studentId);
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
            container.innerHTML = '<div class="no-reviews">Qiymətləndirmə yazılmayıb</div>';
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
        window.location.href = '../';
    }

    // =====================
    // AI FUNCTIONALITY
    // =====================
    
    setupAI() {
        // Initialize Gemini Service
        this.geminiService = new GeminiService();
        this.originalTexts = {};
        
        // Setup AI optimize buttons (individual)
        document.querySelectorAll('.ai-optimize-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const field = e.target.closest('.ai-optimize-btn').dataset.field;
                this.optimizeWithAI(field);
            });
        });
        
        // Setup "Optimize All" button
        const optimizeAllBtn = document.getElementById('optimizeAllBtn');
        if (optimizeAllBtn) {
            optimizeAllBtn.addEventListener('click', () => this.optimizeAllWithAI());
        }
        
        // Update button states based on API key availability
        this.updateAiButtonStates();
    }
    
    updateAiButtonStates() {
        const hasApiKey = this.geminiService.hasApiKey();
        document.querySelectorAll('.ai-optimize-btn').forEach(btn => {
            if (!hasApiKey) {
                btn.title = 'API açarı yoxdur. Tənzimləmələrdən daxil edin.';
            } else {
                btn.title = 'AI ilə optimallaşdır';
            }
        });
        
        const optimizeAllBtn = document.getElementById('optimizeAllBtn');
        if (optimizeAllBtn) {
            if (!hasApiKey) {
                optimizeAllBtn.title = 'API açarı yoxdur. Tənzimləmələrdən daxil edin.';
            } else {
                optimizeAllBtn.title = 'Bütün sahələri AI ilə optimallaşdır (1 sorğu)';
            }
        }
    }
    
    async optimizeAllWithAI() {
        const learnedTextarea = document.getElementById('learned');
        const todayTextarea = document.getElementById('today');
        const feedbackTextarea = document.getElementById('feedback');
        
        const learned = learnedTextarea?.value.trim() || '';
        const today = todayTextarea?.value.trim() || '';
        const feedback = feedbackTextarea?.value.trim() || '';
        
        // Check if at least one field has content
        if (!learned && !today && !feedback) {
            UIHelper.showNotification('Ən azı bir sahəyə mətn yazın', 'error');
            return;
        }
        
        if (!this.geminiService.hasApiKey()) {
            UIHelper.showNotification('API açarı yoxdur. Tənzimləmələrə keçid edilir...', 'error');
            setTimeout(() => {
                window.location.href = '../../settings/';
            }, 1500);
            return;
        }
        
        // Store original texts for undo
        this.originalTexts = this.originalTexts || {};
        if (learned) this.originalTexts['learned'] = learned;
        if (today) this.originalTexts['today'] = today;
        if (feedback) this.originalTexts['feedback'] = feedback;
        
        // Show loading spinner
        const spinner = document.getElementById('optimizeAllSpinner');
        const btn = document.getElementById('optimizeAllBtn');
        if (spinner) spinner.classList.remove('hidden');
        if (btn) btn.disabled = true;
        
        try {
            const result = await this.geminiService.optimizeAllReviewTexts(
                learned || '(boş)',
                today || '(boş)',
                feedback || '(boş)'
            );
            
            // Update textareas with optimized text
            if (learned && result.learned && result.learned !== '(boş)') {
                learnedTextarea.value = result.learned;
                this.showUndoButton('learned');
            }
            if (today && result.today && result.today !== '(boş)') {
                todayTextarea.value = result.today;
                this.showUndoButton('today');
            }
            if (feedback && result.feedback && result.feedback !== '(boş)') {
                feedbackTextarea.value = result.feedback;
                this.showUndoButton('feedback');
            }
            
            UIHelper.showNotification(`Hamısı optimallaşdırıldı (${result.model})`, 'success');
            
        } catch (error) {
            console.error('AI optimization failed:', error);
            UIHelper.showNotification(error.message || 'AI xətası baş verdi', 'error');
        } finally {
            if (spinner) spinner.classList.add('hidden');
            if (btn) btn.disabled = false;
        }
    }
    
    async optimizeWithAI(fieldId) {
        const textarea = document.getElementById(fieldId);
        if (!textarea) return;
        
        const text = textarea.value.trim();
        
        if (!text) {
            UIHelper.showNotification('Optimallaşdırmaq üçün mətn yazın', 'error');
            return;
        }
        
        if (!this.geminiService.hasApiKey()) {
            UIHelper.showNotification('API açarı yoxdur. Tənzimləmələrə keçid edilir...', 'error');
            setTimeout(() => {
                window.location.href = '../../settings/';
            }, 1500);
            return;
        }
        
        // Store original text for undo
        this.originalTexts = this.originalTexts || {};
        this.originalTexts[fieldId] = text;
        
        // Show inline loading spinner next to the button
        this.showAiLoading(true, fieldId);
        
        try {
            const result = await this.geminiService.optimizeReviewText(text, fieldId);
            
            // Put optimized text directly in textarea
            textarea.value = result.text;
            
            // Show undo button
            this.showUndoButton(fieldId);
            
            UIHelper.showNotification(`AI ilə optimallaşdırıldı (${result.model})`, 'success');
            
        } catch (error) {
            console.error('AI optimization failed:', error);
            UIHelper.showNotification(error.message || 'AI xətası baş verdi', 'error');
        } finally {
            this.showAiLoading(false, fieldId);
        }
    }
    
    showAiLoading(show, fieldId) {
        // Show/hide the inline spinner next to the specific field's AI button
        const spinner = document.querySelector(`.ai-loading-spinner-inline[data-field="${fieldId}"]`);
        const button = document.querySelector(`.ai-optimize-btn[data-field="${fieldId}"]`);
        
        if (spinner) {
            spinner.classList.toggle('hidden', !show);
        }
        if (button) {
            button.disabled = show;
        }
    }
    
    showUndoButton(fieldId) {
        // Remove any existing undo button for this field
        const existingUndo = document.querySelector(`.ai-undo-btn[data-field="${fieldId}"]`);
        if (existingUndo) existingUndo.remove();
        
        // Create undo button
        const undoBtn = document.createElement('button');
        undoBtn.type = 'button';
        undoBtn.className = 'ai-undo-btn';
        undoBtn.dataset.field = fieldId;
        undoBtn.innerHTML = '↩ Geri';
        undoBtn.title = 'Əvvəlki mətni qaytar';
        undoBtn.onclick = () => this.undoAiText(fieldId);
        
        // Add undo button next to AI button
        const wrapper = document.querySelector(`.ai-btn-wrapper:has([data-field="${fieldId}"])`);
        if (wrapper) {
            wrapper.appendChild(undoBtn);
        }
    }
    
    undoAiText(fieldId) {
        if (this.originalTexts && this.originalTexts[fieldId]) {
            const textarea = document.getElementById(fieldId);
            if (textarea) {
                textarea.value = this.originalTexts[fieldId];
                UIHelper.showNotification('Mətn geri qaytarıldı', 'success');
            }
            delete this.originalTexts[fieldId];
        }
        
        // Remove undo button
        const undoBtn = document.querySelector(`.ai-undo-btn[data-field="${fieldId}"]`);
        if (undoBtn) undoBtn.remove();
    }
}
