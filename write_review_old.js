// Supabase istemcisini oluştur
const { createClient } = supabase;
const supabaseClient = createClient('https://otqrknvbrlpehmdsvznj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90cXJrbnZicmxwZWhtZHN2em5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjQ5MzMsImV4cCI6MjA3OTI0MDkzM30.HeVrKCP35g8_0Hok1YNP5Wrzcdxpunx6EEr_x5kNPyE');

// DOM Elements
const reviewForm = document.getElementById('reviewForm');
const modulesGrid = document.getElementById('modulesGrid');
const reviewsList = document.getElementById('reviewsList');
const notificationPopup = document.getElementById('notificationPopup');
const notificationMessage = document.getElementById('notificationMessage');

let currentStudentId = null;
let currentReviewerId = null;
let currentUser = null;

// Kullanıcı oturum kontrolü
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return false;
    }
    
    currentUser = session.user;
    return true;
}

function goBack() {
    window.location.href = 'review.html';
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async function() {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        // URL parametrəsindən student ID-ni al
        const urlParams = new URLSearchParams(window.location.search);
        currentStudentId = parseInt(urlParams.get('id'));
        
        if (!currentStudentId) {
            alert('Tələbə ID tapılmadı');
            window.location.href = 'review.html';
            return;
        }
        
        await loadStudentData();
        await loadModules();
        await loadPreviousReviews();
        await getReviewerId();
    }
});

// Tələbə məlumatını yükləmə
async function loadStudentData() {
    try {
        const { data: student, error } = await supabaseClient
            .from('Students')
            .select('*')
            .eq('ID', currentStudentId)
            .single();
        
        if (error || !student) {
            alert('Tələbə məlumatı yüklənə bilmədi');
            window.location.href = 'review.html';
            return;
        }
        
        // Tələbə məlumatını göstər
        document.getElementById('studentName').textContent = `${student.FirstName} ${student.LastName}`;
        document.getElementById('studentEmail').textContent = student.Email;
        document.getElementById('studentCohort').textContent = student.CohortName;
        document.getElementById('studentStatus').textContent = student.Status ? 'Aktiv' : 'Pasiv';
    } catch (error) {
        console.error('Xəta:', error);
        alert('Tələbə məlumatı yüklənə bilmədi: ' + error.message);
    }
}

// Modulları yükləmə
async function loadModules() {
    try {
        const { data: modules, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', currentStudentId)
            .single();
        
        if (error || !modules) {
            modulesGrid.innerHTML = '<p style="color: #999;">Modul məlumatı tapılmadı</p>';
            return;
        }
        
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
        
        let html = '';
        
        moduleColumns.forEach(moduleName => {
            const progress = modules[moduleName];
            
            // Yalnız NULL olmayan modulları göster
            if (progress !== null && progress !== undefined) {
                const progressPercent = Math.min(Math.max(progress, 0), 100);
                
                html += `
                    <div class="module-card">
                        <div class="module-name">${moduleName}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">${progressPercent}%</div>
                    </div>
                `;
            }
        });
        
        if (html === '') {
            modulesGrid.innerHTML = '<p style="color: #999;">Aktiv modul tapılmadı</p>';
        } else {
            modulesGrid.innerHTML = html;
        }
    } catch (error) {
        console.error('Modul yüklənmə xətası:', error);
        modulesGrid.innerHTML = '<p style="color: #e74c3c;">Modullar yüklənə bilmədi</p>';
    }
}

async function loadPreviousReviews() {
    try {
        const { data: reviews, error } = await supabaseClient
            .from('Review')
            .select(`
                *,
                Students!Review_ReviewerID_fkey(FirstName, LastName)
            `)
            .eq('StudentID', currentStudentId)
            .order('WriteDate', { ascending: false });

        if (error) {
            console.error('Qiymətləndirmə yüklənmə xətası:', error);
            reviewsList.innerHTML = '<div class="no-reviews">Əvvəlki qiymətləndirmələr yüklənə bilmədi</div>';
            return;
        }
        
        if (!reviews || reviews.length === 0) {
            reviewsList.innerHTML = '<div class="no-reviews">Hələ qiymətləndirmə yazılmamış</div>';
            return;
        }
        
        let html = '';
        
        reviews.forEach(review => {
            const reviewDate = new Date(review.WriteDate).toLocaleString('az-AZ', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const reviewerName = review.Students 
                ? `${review.Students.FirstName} ${review.Students.LastName}` 
                : 'Bilinmir';
            
            html += `
                <div class="review-card">
                    <div class="review-date">${reviewDate}</div>
                    <div class="review-reviewer">Qiymətləndirən: ${reviewerName}</div>
                    <div class="review-content">
                        <div class="review-item">
                            <div class="review-label">Bu günə kimi öyrəndi:</div>
                            <div class="review-text">${review.UntilToday}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">Bu gün edəcəkdir:</div>
                            <div class="review-text">${review.Today}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">Qiymətləndirici fikri:</div>
                            <div class="review-text">${review.ReviewerFeedback}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        reviewsList.innerHTML = html;
    } catch (error) {
        console.error('Xəta:', error);
        reviewsList.innerHTML = '<div class="no-reviews">Xəta: Qiymətləndirmələr yüklənə bilmədi</div>';
    }
}

// Qiymətləndirənin ID-sini al
async function getReviewerId() {
    try {
        // Qiymətləndirənin ID-sini al (Reviewer cədvəlindən)
        const { data: reviewerData, error: reviewerError } = await supabaseClient
            .from('Reviewer')
            .select('StudentID')
            .eq('AuthID', currentUser.id)
            .single();
        
        if (reviewerError) {
            console.error('Reviewer table sorgusu başarısız:', reviewerError);
        }
        
        if (reviewerData && reviewerData.StudentID) {
            currentReviewerId = reviewerData.StudentID;
        } else {
            // Fallback: try Students table
            const { data: studentData, error: studentError } = await supabaseClient
                .from('Students')
                .select('ID')
                .eq('UserID', currentUser.id);
            
            if (studentError) {
                console.error('Students table sorgusu başarısız:', studentError);
            }
            
            if (studentData && studentData.length > 0) {
                currentReviewerId = studentData[0].ID;
            }
        }
    } catch (error) {
        console.error('Reviewer ID alınmadı:', error);
    }
}

// Notification göstərə
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

// Form submit
reviewForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentReviewerId) {
        alert('Xəta: Qiymətləndirən məlumatı alına bilmədi');
        return;
    }
    
    const learned = document.getElementById('learned').value;
    const today = document.getElementById('today').value;
    const feedback = document.getElementById('feedback').value;
    
    try {
        // Review'ı Supabase'e kaydet
        const { error: insertError } = await supabaseClient
            .from('Review')
            .insert([{
                ReviewerID: currentReviewerId,
                StudentID: currentStudentId,
                WriteDate: new Date().toISOString(),
                UntilToday: learned,
                Today: today,
                ReviewerFeedback: feedback
            }]);
        
        if (insertError) {
            console.error('Qiymətləndirmə saxlanma xətası:', insertError);
            alert('Xəta: Qiymətləndirmə saxlana bilmədi - ' + insertError.message);
            return;
        }
        
        // Formu temizlə
        reviewForm.reset();
        
        // Əvvəlki qiymətləndirmələri yeniləmə
        await loadPreviousReviews();
        
        // Başarı mesajı
        showNotification('Qiymətləndirmə uğurla saxlanıldı!');
    } catch (error) {
        console.error('Xəta:', error);
        alert('Xəta: ' + error.message);
    }
});
