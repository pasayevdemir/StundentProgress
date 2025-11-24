// Supabase istemcisini oluştur
const { createClient } = supabase;
const supabaseClient = createClient('https://otqrknvbrlpehmdsvznj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90cXJrbnZicmxwZWhtZHN2em5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjQ5MzMsImV4cCI6MjA3OTI0MDkzM30.HeVrKCP35g8_0Hok1YNP5Wrzcdxpunx6EEr_x5kNPyE');

// Giriş yapan kullanıcıyı review sayfasına yönlendir
async function checkExistingSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Kullanıcı zaten giriş yapmış, review sayfasına yönlendir
        window.location.href = 'review.html';
        return false;
    }
    
    return true;
}

// Sayfa yüklendiğinde oturum kontrolü yap
document.addEventListener('DOMContentLoaded', checkExistingSession);

const loginForm = document.getElementById('loginForm');
const alertMessage = document.getElementById('alertMessage');
const alertText = document.getElementById('alertText');

function showAlert(message, type = 'error') {
    alertText.textContent = message;
    alertMessage.className = `alert-message ${type}`;
    alertMessage.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        alertMessage.classList.add('hidden');
    }, 5000);
}

loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
    })

    if (error) {
        showAlert('Login failed: ' + error.message, 'error');
    } else {
        showAlert('Login successful! Welcome, ' + data.user.email, 'success');
        setTimeout(() => {
            window.location.href = 'review.html';
        }, 1000);
    }
});
