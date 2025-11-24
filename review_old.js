// Review form elementi
const reviewForm = document.getElementById('reviewForm');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const modalOverlay = document.getElementById('modalOverlay');
const reviewFormContainer = document.getElementById('reviewFormContainer');
const selectedStudentNameSpan = document.getElementById('selectedStudentName');
const cancelBtn = document.getElementById('cancelBtn');
const closeModal = document.getElementById('closeModal');
const notificationPopup = document.getElementById('notificationPopup');
const notificationMessage = document.getElementById('notificationMessage');
const studentsTableBody = document.getElementById('studentsTableBody');

// Supabase istemcisini oluştur
const { createClient } = supabase;
const supabaseClient = createClient('https://otqrknvbrlpehmdsvznj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90cXJrbnZicmxwZWhtZHN2em5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjQ5MzMsImV4cCI6MjA3OTI0MDkzM30.HeVrKCP35g8_0Hok1YNP5Wrzcdxpunx6EEr_x5kNPyE');

// Kullanıcı oturum kontrolü
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
        alert('Çıkış başarısız: ' + error.message);
    } else {
        window.location.href = 'index.html';
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        loadStudents();
    }
});

let reviews = JSON.parse(localStorage.getItem('reviews')) || [];
let currentStudentName = '';
let currentStudentId = null;
let students = [];

// Tələbələri və onların modullərini yükləmə
async function loadStudents() {
    try {
        // Tələbələri yükləmə
        const { data: studentsData, error: studentsError } = await supabaseClient
            .from('Students')
            .select('*')
            .eq('Status', true);
        
        if (studentsError) {
            console.error('Tələbə yükləmə hatası:', studentsError);
            studentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tələbələr yükləntmədi</td></tr>';
            return;
        }
        
        if (!studentsData || studentsData.length === 0) {
            studentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tələbə tapılmadı</td></tr>';
            return;
        }
        
        students = studentsData;
        
        // Tələbələrin modullərini yükləmə
        const { data: modulesData, error: modulesError } = await supabaseClient
            .from('Progresses')
            .select('*');
        
        const modulesMap = {};
        if (!modulesError && modulesData) {
            modulesData.forEach(module => {
                modulesMap[module.StudentID] = module;
            });
        }
        
        // Cədvəli doldur
        displayStudentsTable(students, modulesMap);
    } catch (error) {
        console.error('Xəta:', error);
        studentsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Xəta: ' + error.message + '</td></tr>';
    }
}

function displayStudentsTable(studentsList, modulesMap) {
    let html = '';
    
    studentsList.forEach(student => {
        const modules = modulesMap[student.ID];
        const moduleCount = countCompletedModules(modules);
        const statusClass = student.Status ? 'active' : 'inactive';
        const statusText = student.Status ? 'Aktiv' : 'Pasiv';
        
        html += `
            <tr>
                <td>${student.FirstName} ${student.LastName}</td>
                <td>${student.Email}</td>
                <td>${student.CohortName}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td class="modules-info">${moduleCount} modul tamamlandı</td>
                <td><button class="review-btn" onclick="selectStudentForReview('${student.ID}', '${student.FirstName} ${student.LastName}')">Edit</button></td>
            </tr>
        `;
    });
    
    studentsTableBody.innerHTML = html;
}

function countCompletedModules(modules) {
    if (!modules) return 0;
    
    const moduleColumns = [
        'Onboarding', 'Preseason Web', 'Preseason Data', 'Season 01 Arc 01', 
        'Season 01 Arc 02', 'Season 01 Cloud Devops', 'Season 02 Fullstack', 
        'Season 03 Fullstack Java', 'Season 03 Fullstack Python', 'Season 03 Frontend', 
        'Season 03 Backend', 'Season 03 Cloud Engineer', 'Season 02 Data Science', 
        'Season 02 Software Engineer', 'Season 03 Software Engineer Golang', 
        'Season 03 Software Engineer CPP', 'Season 03 Software Engineer Rust', 
        'Season 03 Machine Learning', 'Season 03 Data Science', 'Season 03 Agentic AI', 
        'Season 04 Masters'
    ];
    
    let count = 0;
    moduleColumns.forEach(col => {
        if (modules[col] && modules[col] > 0) {
            count++;
        }
    });
    
    return count;
}

function showNotification(message) {
    notificationMessage.textContent = message;
    notificationPopup.classList.remove('hidden');
    notificationPopup.classList.add('show');
    
    setTimeout(() => {
        notificationPopup.classList.remove('show');
        setTimeout(() => {
            notificationPopup.classList.add('hidden');
        }, 300);
    }, 2500);
}

searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.trim();
    
    if (searchTerm.length === 0) {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
        return;
    }
    
    const filteredStudents = students.filter(student => {
        const fullName = `${student.FirstName} ${student.LastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
    });
    
    displaySearchResults(filteredStudents, searchTerm);
});

function displaySearchResults(filteredStudents, searchTerm) {
    let html = '';
    
    filteredStudents.forEach(student => {
        const fullName = `${student.FirstName} ${student.LastName}`;
        html += `<div class="search-item" onclick="selectStudentForReview('${student.ID}', '${fullName}')">${fullName}</div>`;
    });
    
    if (html === '') {
        html = '<div class="search-item">Nəticə tapılmadı</div>';
    }
    
    searchResults.innerHTML = html;
    searchResults.classList.add('active');
}

function selectStudentForReview(studentId, studentName) {
    // Yeni səhifəyə yönləndirmə
    window.location.href = `write_review.html?id=${studentId}`;
}

// Modal'ı kapat
function closeModalFunction() {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = ''; // Scroll'u geri aç
    reviewForm.reset();
    currentStudentName = '';
}

// İptal butonu
cancelBtn.addEventListener('click', closeModalFunction);

// X butonu
closeModal.addEventListener('click', closeModalFunction);

// Overlay'e tıklayınca modal'ı kapat
modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
        closeModalFunction();
    }
});

// Form submit event listener
reviewForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentStudentName || !currentStudentId) {
        alert('Zəhmət olmasa əvvəlcə tələbə seçin!');
        return;
    }
    
    // Form değerlerini al
    const learned = document.getElementById('learned').value;
    const today = document.getElementById('today').value;
    const feedback = document.getElementById('feedback').value;
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
            alert('Xəta: İstifadəçi məlumatı alına bilmədi');
            return;
        }
        
        console.log('Logged in user ID:', user.id);
        
        // Qiymətləndirənin ID-sini al (Students cədvəlindən)
        // First try to find reviewer in Reviewer table
        const { data: reviewerData, error: reviewerError } = await supabaseClient
            .from('Reviewer')
            .select('StudentID')
            .eq('AuthID', user.id)
            .single();
        
        if (reviewerError) {
            console.error('Reviewer table sorgusu başarısız:', reviewerError);
        }
        
        let reviewerId = null;
        
        if (reviewerData && reviewerData.StudentID) {
            reviewerId = reviewerData.StudentID;
        } else {
            // Fallback: try Students table
            const { data: studentData, error: studentError } = await supabaseClient
                .from('Students')
                .select('ID')
                .eq('UserID', user.id);
            
            if (studentError) {
                console.error('Students table sorgusu başarısız:', studentError);
            }
            
            if (studentData && studentData.length > 0) {
                reviewerId = studentData[0].ID;
            }
        }
        
        if (!reviewerId) {
            alert('Xəta: Siz qiymətləndirən hesabı ilə qeydiyyatdan keçməmisiniz');
            return;
        }
        
        // Review'ı Supabase'e kaydet
        const { error: insertError, data: insertedReview } = await supabaseClient
            .from('Review')
            .insert([{
                ReviewerID: reviewerId,
                StudentID: currentStudentId,
                WriteDate: new Date().toISOString(),
                UntilToday: learned,
                Today: today,
                ReviewerFeedback: feedback
            }])
            .select();
        
        if (insertError) {
            alert('Xəta: Qiymətləndirmə saxlana bilmədi - ' + insertError.message);
            return;
        }
        
        // Local storage'a da kaydet (backup)
        const review = {
            id: Date.now(),
            studentName: currentStudentName,
            learned: learned,
            today: today,
            feedback: feedback,
            date: new Date().toLocaleString('tr-TR')
        };
        reviews.unshift(review);
        localStorage.setItem('reviews', JSON.stringify(reviews));
        
        // Modal'ı kapat ve formu temizle
        closeModalFunction();
        
        // Başarı mesajı
        showNotification('Qiymətləndirmə uğurla saxlanıldı!');
    } catch (e) {
        console.error('Xəta:', e);
        alert('Xəta: ' + e.message);
    }
});

// Sayfa dışına tıklandığında arama sonuçlarını gizle
document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});
