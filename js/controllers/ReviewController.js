// Review Controller
class ReviewController {
    constructor() {
        this.currentUser = null;
        this.reviewerId = null;
        this.students = [];
        this.allStudents = []; // Source of truth
    }
    
    async init() {
        await this.checkAuth();
        await this.getReviewerId();
        await this.loadStudents();
        this.setupFilters();
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
            
            // Get today's reviews
            const todayReviews = await ReviewModel.getTodayReviews();
            const reviewedStudentIds = new Set(todayReviews.map(r => r.StudentID));
            
            // Get latest progress for ALL students in a SINGLE query (avoids N+1 problem)
            const studentIds = allStudents.map(s => s.ID);
            const progressMap = await ProgressModel.getLatestProgressForStudents(studentIds);
            
            // Map students with their progress (no additional DB calls needed)
            this.allStudents = allStudents.map(student => {
                const progress = progressMap[student.ID] || null;
                const hasReviewToday = reviewedStudentIds.has(student.ID);
                return { ...student, latestProgress: progress, hasReviewToday };
            });
            
            this.populateFilterOptions();
            this.applyFilters(); // Initial render
            
        } catch (error) {
            console.error('Tələbələr yüklənə bilmədi:', error);
            UIHelper.showNotification('Tələbələr yüklənə bilmədi', 'error');
        }
    }
    
    populateFilterOptions() {
        // Populate Cohorts
        const cohorts = [...new Set(this.allStudents.map(s => s.CohortName))].filter(Boolean).sort();
        const cohortSelect = document.getElementById('filterCohort');
        if (cohortSelect) {
            cohorts.forEach(cohort => {
                const option = document.createElement('option');
                option.value = cohort;
                option.textContent = cohort;
                cohortSelect.appendChild(option);
            });
        }
        
        // Populate Modules (Count based)
        const moduleSelect = document.getElementById('filterModule');
        if (moduleSelect) {
            // Add options for 0 to max modules
            const maxModules = MODULE_COLUMNS.length;
            for (let i = 0; i <= maxModules; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i === 0 ? '0' : i;
                moduleSelect.appendChild(option);
            }
        }
    }
    
    setupFilters() {
        const inputs = [
            'filterName', 'filterSurname', 'filterEmail',
            'filterCohort', 'filterStatus', 'filterModule',
            'quickSearch'
        ];
        
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.applyFilters());
                el.addEventListener('change', () => this.applyFilters());
            }
        });

        // Mobile Filter Toggle
        const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
        if (toggleFiltersBtn) {
            toggleFiltersBtn.addEventListener('click', () => {
                const container = document.getElementById('filtersContainer');
                if (container) {
                    container.classList.toggle('show');
                }
            });
        }
        
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilters());
        }
        
        // Handle the old toggle view button if it still exists (as legacy or alternative)
        // For now, we're relying on the Status filter, but let's make sure the old button doesn't break anything
        // or effectively removes it if we updated the HTML to remove it. 
        // We didn't remove it from HTML yet (it was in the header), so let's handle it or ignore it.
        // Actually, let's keep the toggle button logic connected to the status filter for backward compatibility if user clicks it.
        const toggleBtn = document.getElementById('toggleViewBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const statusSelect = document.getElementById('filterStatus');
                if (statusSelect) {
                    if (statusSelect.value === 'pending') {
                        statusSelect.value = ''; // Show all
                    } else {
                        statusSelect.value = 'pending'; // Show pending
                    }
                    this.applyFilters();
                }
            });
        }
    }
    
    resetFilters() {
        document.getElementById('filterName').value = '';
        document.getElementById('filterSurname').value = '';
        document.getElementById('filterEmail').value = '';
        document.getElementById('filterCohort').value = '';
        document.getElementById('filterStatus').value = ''; // Default to All on reset? Or Pending? Let's say All.
        document.getElementById('filterModule').value = '';
        const quickSearch = document.getElementById('quickSearch');
        if (quickSearch) quickSearch.value = '';
        this.applyFilters();
    }
    
    applyFilters() {
        const filters = {
            name: document.getElementById('filterName')?.value.toLowerCase().trim() || '',
            surname: document.getElementById('filterSurname')?.value.toLowerCase().trim() || '',
            email: document.getElementById('filterEmail')?.value.toLowerCase().trim() || '',
            cohort: document.getElementById('filterCohort')?.value || '',
            status: document.getElementById('filterStatus')?.value || '',
            module: document.getElementById('filterModule')?.value || '',
            quickSearch: document.getElementById('quickSearch')?.value.toLowerCase().trim() || ''
        };
        
        this.students = this.allStudents.filter(student => {
            // Quick Search
            if (filters.quickSearch) {
                const search = filters.quickSearch;
                const match = student.FirstName.toLowerCase().includes(search) ||
                              student.LastName.toLowerCase().includes(search) ||
                              student.Email.toLowerCase().includes(search);
                if (!match) return false;
            }

            // Name Filter
            if (filters.name && !student.FirstName.toLowerCase().includes(filters.name)) return false;
            
            // Surname Filter
            if (filters.surname && !student.LastName.toLowerCase().includes(filters.surname)) return false;
            
            // Email Filter
            if (filters.email && !student.Email.toLowerCase().includes(filters.email)) return false;
            
            // Cohort Filter
            if (filters.cohort && student.CohortName !== filters.cohort) return false;
            
            // Status Filter
            if (filters.status) {
                if (filters.status === 'pending' && student.hasReviewToday) return false;
                if (filters.status === 'reviewed' && !student.hasReviewToday) return false;
            }
            
            // Module Filter (Count based)
            if (filters.module !== '') {
                const requiredCount = parseInt(filters.module);
                const actualCount = this.countCompletedModules(student.latestProgress);
                if (actualCount !== requiredCount) return false;
            }
            
            return true;
        });
        
        this.renderStudentsTable(this.students);
        this.updateHeader(this.students.length);
    }
    
    updateHeader(count) {
        const tableTitle = document.getElementById('tableTitle');
        const toggleBtn = document.getElementById('toggleViewBtn');
        const statusFilter = document.getElementById('filterStatus')?.value;
        
        if (tableTitle) {
            let title = 'Tələbələr';
            if (statusFilter === 'pending') title = 'Qiymətləndirilməmiş Tələbələr';
            else if (statusFilter === 'reviewed') title = 'Qiymətləndirilmiş Tələbələr';
            else title = 'Bütün Tələbələr';
            
            tableTitle.textContent = `${title} (${count})`;
        }
        
        if (toggleBtn) {
            // Update toggle button state to reflect filters
             if (statusFilter === 'pending') {
                toggleBtn.textContent = '👥 Bütün Tələbələr';
                toggleBtn.title = 'Bütün tələbələri göstər';
            } else {
                toggleBtn.textContent = '📋 Qiymətləndirilməmişlər';
                toggleBtn.title = 'Bugün qiymətləndirilməmiş tələbələri göstər';
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
    
    openStudentDetail(studentId) {
        window.location.href = `write/?id=${studentId}`;
    }
    
    async logout() {
        await supabaseClient.auth.signOut();
        window.location.href = '../login/';
    }
}
