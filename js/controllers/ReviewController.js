// Review Controller
class ReviewController {
    constructor() {
        this.currentUser = null;
        this.reviewerId = null;
        this.students = [];
        this.allStudents = [];
        this.studentsWithoutReview = [];
        this.showAll = false;
    }
    
    async init() {
        await this.checkAuth();
        await this.getReviewerId();
        await this.loadStudents();
        this.setupEventListeners();
    }
    
    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = '../login/';
            return;
        }
        
        this.currentUser = session.user;
    }
    
    async getReviewerId() {
        this.reviewerId = await ReviewerModel.getStudentIdByAuthId(this.currentUser.id);
        
        if (!this.reviewerId) {
            console.warn('Reviewer ID tapılmadı');
        }
    }
    
    async loadStudents() {
        try {
            // Get all active students
            const allStudents = await StudentModel.getAll();
            
            // Get today's reviews to filter out students who already have reviews
            const todayReviews = await ReviewModel.getTodayReviews();
            const reviewedStudentIds = new Set(todayReviews.map(r => r.StudentID));
            
            // Get latest progress for all students
            this.allStudents = await Promise.all(
                allStudents.map(async (student) => {
                    const progress = await ProgressModel.getLatestByStudentId(student.ID);
                    const hasReviewToday = reviewedStudentIds.has(student.ID);
                    return { ...student, latestProgress: progress, hasReviewToday };
                })
            );
            
            // Filter students who don't have a review for today
            this.studentsWithoutReview = this.allStudents.filter(
                student => !student.hasReviewToday
            );
            
            // Show students without review by default
            this.displayStudents();
            
        } catch (error) {
            console.error('Tələbələr yüklənə bilmədi:', error);
            UIHelper.showNotification('Tələbələr yüklənə bilmədi', 'error');
        }
    }
    
    displayStudents() {
        const studentsToShow = this.showAll ? this.allStudents : this.studentsWithoutReview;
        this.students = studentsToShow;
        this.renderStudentsTable(studentsToShow);
        this.updateSearchResults(studentsToShow);
        this.updateToggleButton();
    }
    
    toggleView() {
        this.showAll = !this.showAll;
        this.displayStudents();
    }
    
    updateToggleButton() {
        const toggleBtn = document.getElementById('toggleViewBtn');
        const tableTitle = document.getElementById('tableTitle');
        
        if (toggleBtn) {
            if (this.showAll) {
                toggleBtn.textContent = '📋 Qiymətləndirilməmişlər';
                toggleBtn.title = 'Bugün qiymətləndirilməmiş tələbələri göstər';
            } else {
                toggleBtn.textContent = '👥 Bütün Tələbələr';
                toggleBtn.title = 'Bütün tələbələri göstər';
            }
        }
        
        if (tableTitle) {
            const count = this.showAll ? this.allStudents.length : this.studentsWithoutReview.length;
            if (this.showAll) {
                tableTitle.textContent = `Bütün Tələbələr (${count})`;
            } else {
                tableTitle.textContent = `Bugün Qiymətləndirilməmiş Tələbələr (${count})`;
            }
        }
    }
    
    renderStudentsTable(students) {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tələbə tapılmadı</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map(student => {
            const moduleCount = this.countCompletedModules(student.latestProgress);
            const reviewStatus = student.hasReviewToday 
                ? '<span class="status reviewed">✓</span>' 
                : '<span class="status pending">Gözləyir</span>';
            return `
                <tr>
                    <td>${UIHelper.escapeHtml(student.FirstName + ' ' + student.LastName)}</td>
                    <td>${UIHelper.escapeHtml(student.Email)}</td>
                    <td>${UIHelper.escapeHtml(student.CohortName)}</td>
                    <td>${reviewStatus}</td>
                    <td class="modules-info">${moduleCount} aktiv modul</td>
                    <td><button class="review-btn" onclick="reviewController.openStudentDetail(${student.ID})">Review</button></td>
                </tr>
            `;
        }).join('');
    }
    
    countCompletedModules(progress) {
        if (!progress) return 0;
        
        return MODULE_COLUMNS.filter(module => {
            const value = progress[module];
            return value !== null && value !== undefined && value > 0;
        }).length;
    }
    
    updateSearchResults(students) {
        this.students = students;
    }
    
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim().toLowerCase();
                
                if (term.length === 0) {
                    searchResults.classList.remove('active');
                    return;
                }
                
                const filtered = this.students.filter(s => {
                    const fullName = `${s.FirstName} ${s.LastName}`.toLowerCase();
                    return fullName.includes(term);
                });
                
                this.renderSearchResults(filtered, searchResults);
            });
        }
    }
    
    renderSearchResults(students, container) {
        if (students.length === 0) {
            container.innerHTML = '<div class="search-item">Nəticə tapılmadı</div>';
        } else {
            container.innerHTML = students.map(s => 
                `<div class="search-item" onclick="reviewController.openStudentDetail(${s.ID})">${UIHelper.escapeHtml(s.FirstName + ' ' + s.LastName)}</div>`
            ).join('');
        }
        container.classList.add('active');
    }
    
    openStudentDetail(studentId) {
        window.location.href = `write/?id=${studentId}`;
    }
    
    async logout() {
        await supabaseClient.auth.signOut();
        window.location.href = '../login/';
    }
}
