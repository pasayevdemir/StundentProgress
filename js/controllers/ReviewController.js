// Review Controller
class ReviewController {
    constructor() {
        this.currentUser = null;
        this.reviewerId = null;
        this.students = [];
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
            window.location.href = 'login.html';
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
            // Show all students (including inactive ones)
            this.students = await StudentModel.getAll(false);
            
            // Get latest progress for each student
            const studentsWithProgress = await Promise.all(
                this.students.map(async (student) => {
                    const progress = await ProgressModel.getLatestByStudentId(student.ID);
                    return { ...student, latestProgress: progress };
                })
            );
            
            this.renderStudentsTable(studentsWithProgress);
            this.updateSearchResults(studentsWithProgress);
            
        } catch (error) {
            console.error('Tələbələr yüklənə bilmədi:', error);
            UIHelper.showNotification('Tələbələr yüklənə bilmədi', 'error');
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
            return `
                <tr>
                    <td>${UIHelper.escapeHtml(student.FirstName + ' ' + student.LastName)}</td>
                    <td>${UIHelper.escapeHtml(student.Email)}</td>
                    <td>${UIHelper.escapeHtml(student.CohortName)}</td>
                    <td><span class="status active">Aktiv</span></td>
                    <td class="modules-info">${moduleCount} aktiv modul</td>
                    <td><button class="review-btn" onclick="reviewController.openStudentDetail(${student.ID})">Qiymətləndirmə</button></td>
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
        window.location.href = `write_review.html?id=${studentId}`;
    }
    
    async logout() {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    }
}
