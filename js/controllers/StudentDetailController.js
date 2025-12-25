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
        await this.loadPresentations();
        this.setupTabNavigation();
        this.setupForm();
        this.setupAI();
        this.setupDateSelector();
        this.setupBottomNavigation();
    }
    
    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = '../../login/';
            return;
        }
        
        this.currentUser = session.user;
    }
    
    setupBottomNavigation() {
        // Active state handling for bottom navbar is simpler:
        // We highlight based on scroll position or click
        // For now, simple click-to-activate
        const bottomBtns = document.querySelectorAll('.bottom-nav-btn');
        bottomBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active from all
                bottomBtns.forEach(b => b.classList.remove('active'));
                // Add to clicked (closest button in case icon clicked)
                const targetBtn = e.target.closest('.bottom-nav-btn');
                if (targetBtn) targetBtn.classList.add('active');
            });
        });

        // Optional: Scroll spy to update active button content
        window.addEventListener('scroll', () => {
            if (window.innerWidth <= 768) {
                this.updateActiveBottomNavLink();
            }
        });
    }

    scrollToSection(sectionId) {
        // Ensure Write Tab is active
        const writeTabBtn = document.querySelector('.tab-btn[data-tab="write"]');
        if (writeTabBtn && !writeTabBtn.classList.contains('active')) {
            writeTabBtn.click();
        }

        const section = document.getElementById(sectionId);
        if (section) {
            // Offset for fixed header/navbar?
            // Mobile header is ~4rem.
            const headerOffset = 80; 
            const elementPosition = section.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            
            // Also update the active state of bottom nav manually
            this.updateActiveBottomNavBySection(sectionId);
        }
    }

    updateActiveBottomNavBySection(sectionId) {
        let keyword = '';
        if (sectionId === 'modulesSection') keyword = 'Modullar';
        if (sectionId === 'writeSection') keyword = 'Qiymətləndirmə';
        if (sectionId === 'reportsSection') keyword = 'Raportlar';

        if (keyword) {
            const bottomBtns = document.querySelectorAll('.bottom-nav-btn');
            bottomBtns.forEach(btn => {
                if (btn.innerText.includes(keyword)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    updateActiveBottomNavLink() {
        // Simple scroll spy
        const sections = ['writeSection', 'modulesSection', 'reportsSection'];
        let current = '';

        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                const sectionTop = section.offsetTop;
                if (pageYOffset >= sectionTop - 150) {
                    current = id;
                }
            }
        });

        if (current) {
            this.updateActiveBottomNavBySection(current);
        }
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
            
            console.log('Latest date:', latestDate.toISOString().split('T')[0]);
            console.log('Target date (minus', daysToCompare, 'days):', targetDate.toISOString().split('T')[0]);
            
            // Find progress closest to target date (before it)
            this.previousProgress = await ProgressModel.getClosestProgressBeforeDate(
                this.studentId,
                targetDate.toISOString().split('T')[0]
            );
            
            // If no progress before target date, get the earliest progress
            if (!this.previousProgress) {
                console.log('No progress before target date, getting earliest');
                this.previousProgress = await ProgressModel.getEarliestProgress(this.studentId);
                
                // If earliest is same as latest, set to null (no comparison)
                if (this.previousProgress && this.previousProgress.ID === this.latestProgress.ID) {
                    this.previousProgress = null;
                }
            }
            
            console.log('Previous progress:', this.previousProgress ? this.previousProgress.ProgressDate : 'null');
            console.log('Latest progress:', this.latestProgress.ProgressDate);
            
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
        
        console.log('Rendering progress with differences:', differences);
        console.log('Latest progress data:', this.latestProgress);
        console.log('Previous progress data:', this.previousProgress);
        
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
                
                // Show change indicator if there's a difference OR if we're comparing and values differ
                const hasChange = diff && diff.difference !== 0;
                const changeIndicator = hasChange ? `
                    <div class="progress-change ${diff.difference > 0 ? 'positive' : 'negative'}">
                        ${previousPercent !== null ? `${previousPercent}% → ${progressPercent}%` : `${progressPercent}%`}
                        <span style="font-weight: bold; margin-left: 0.5rem;">
                            (${diff.difference > 0 ? '+' : ''}${diff.difference}%)
                        </span>
                    </div>
                ` : '';
                
                html += `
                    <div class="module-card ${hasChange ? 'has-change' : ''}">
                        <div class="module-name">${module}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">${progressPercent}%</div>
                        ${changeIndicator}
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

    async loadPresentations() {
        try {
            const presentations = await TechnicalPresentationModel.getByStudentId(this.studentId);
            this.renderPresentations(presentations);
        } catch (error) {
            console.error('Təqdimatlar yüklənə bilmədi:', error);
        }
    }

    renderPresentations(presentations) {
        const container = document.getElementById('presentationsList');
        if (!container) return;
        
        if (!presentations || presentations.length === 0) {
            container.innerHTML = '<div class="no-reviews">Texniki təqdimat qiymətləndirməsi yoxdur</div>';
            return;
        }
        
        container.innerHTML = presentations.map(pres => {
            const reviewerName = pres.Reviewer 
                ? `${pres.Reviewer.FirstName} ${pres.Reviewer.LastName}` 
                : 'Bilinmir';
            
            const totalScore = TechnicalPresentationModel.calculateTotalScore(pres);
            const scoreLevel = TechnicalPresentationModel.getScoreLevel(totalScore);
            
            return `
                <div class="presentation-card">
                    <div class="presentation-header">
                        <div class="presentation-date">📅 ${UIHelper.formatDate(pres.created_at)}</div>
                        <div class="presentation-reviewer">👤 ${UIHelper.escapeHtml(reviewerName)}</div>
                    </div>
                    
                    <div class="presentation-scores">
                        <div class="score-item">
                            <span class="score-label">Vaxt İdarəsi</span>
                            <span class="score-value">${pres.TimeManagement}/10</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Təqdimat Bacarığı</span>
                            <span class="score-value">${pres.PresentationSkill}/10</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Slayd Hazırlığı</span>
                            <span class="score-value">${pres.SlidePreparation}/10</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Mövzu Əhatəsi</span>
                            <span class="score-value">${pres.TopicCoverage}/10</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">İnkişaf</span>
                            <span class="score-value">${pres.Progress}/10</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Slayd Dizaynı</span>
                            <span class="score-value">${pres.SlideDesign}/10</span>
                        </div>
                    </div>
                    
                    <div class="presentation-total" style="background: linear-gradient(135deg, ${scoreLevel.color}, ${scoreLevel.color}dd);">
                        <span class="presentation-total-label">Ortalama: ${scoreLevel.label}</span>
                        <span class="presentation-total-score">${totalScore}/10</span>
                    </div>
                    
                    <div class="presentation-description">
                        <span class="presentation-description-label">📝 Açıqlama:</span>
                        ${UIHelper.escapeHtml(pres.Description)}
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

    setupTabNavigation() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        const bottomNavbar = document.querySelector('.bottom-navbar');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                btn.classList.add('active');
                const targetContent = document.getElementById(`${tabName}Tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                // Show/hide bottom navbar based on active tab
                if (bottomNavbar) {
                    if (tabName === 'write') {
                        bottomNavbar.style.display = '';
                    } else {
                        bottomNavbar.style.display = 'none';
                    }
                }
            });
        });
    }

    setupForm() {
        const form = document.getElementById('reviewForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitReview();
        });

        // Setup presentation form
        const presentationForm = document.getElementById('presentationForm');
        if (presentationForm) {
            presentationForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitPresentation();
            });
        }
    }    async submitReview() {
        if (!this.reviewerId) {
            UIHelper.showNotification('Qiymətləndirən məlumatı tapılmadı', 'error');
            return;
        }
        
        const learned = document.getElementById('learned').value;
        const today = document.getElementById('today').value;
        let feedback = document.getElementById('feedback').value;
        
        // Get metrics and append to feedback
        const prob = document.getElementById('metricProb')?.value.trim();
        const lvt = document.getElementById('metricLvt')?.value.trim();
        const level = document.getElementById('metricLevel')?.value.trim();
        
        // Append metrics to feedback if any are filled
        if (prob || lvt || level) {
            feedback += '\n';
            if (prob) feedback += `\nPROB: ${prob}`;
            if (lvt) feedback += `\nLVT: ${lvt}`;
            if (level) feedback += `\nLEVEL: ${level}`;
        }
        
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

    async submitPresentation() {
        const form = document.getElementById('presentationForm');
        const formData = new FormData(form);
        
        const presentationData = {
            ReviewerID: this.reviewerId,
            StudentID: this.studentId,
            TimeManagement: parseInt(formData.get('TimeManagement')),
            PresentationSkill: parseInt(formData.get('PresentationSkill')),
            SlidePreparation: parseInt(formData.get('SlidePreparation')),
            TopicCoverage: parseInt(formData.get('TopicCoverage')),
            Progress: parseInt(formData.get('Progress')),
            SlideDesign: parseInt(formData.get('SlideDesign')),
            Description: formData.get('Description')
        };
        
        console.log('Submitting presentation data:', presentationData);
        console.log('Current user AuthID:', this.currentUser.id);
        console.log('Reviewer ID:', this.reviewerId);
        console.log('Student ID:', this.studentId);
        
        try {
            await TechnicalPresentationModel.create(presentationData);
            
            form.reset();
            await this.loadPresentations(); // Reload presentation history
            UIHelper.showNotification('Texniki təqdimat qiymətləndirməsi uğurla saxlanıldı!', 'success');
        } catch (error) {
            console.error('Təqdimat qiymətləndirməsi saxlana bilmədi:', error);
            console.error('Error details:', error.message, error.details, error.hint);
            UIHelper.showNotification('Xəta: ' + error.message, 'error');
        }
    }

    clearPresentationForm() {
        const form = document.getElementById('presentationForm');
        if (form) {
            form.reset();
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
