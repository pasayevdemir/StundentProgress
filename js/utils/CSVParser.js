// CSV Parser Utility
class CSVParser {
    // Helper: Get value from row by key (case-insensitive)
    static getRowValue(row, key) {
        // Try exact match first
        if (row[key] !== undefined) return row[key];
        
        // Try case-insensitive match
        const lowerKey = key.toLowerCase();
        for (const k in row) {
            if (k.toLowerCase() === lowerKey) {
                return row[k];
            }
        }
        return null;
    }
    
    static parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV faylı boşdur və ya yanlış formatdadır');
        
        // Detect delimiter (comma or tab)
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        
        const headers = firstLine.split(delimiter).map(h => h.trim());
        const rows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(delimiter);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : null;
            });
            
            rows.push(row);
        }
        
        return { headers, rows };
    }
    
    static extractStudentData(row) {
        const name = this.getRowValue(row, 'Name');
        const nameParts = name ? name.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const userID = this.getRowValue(row, 'User ID');
        const login = this.getRowValue(row, 'Login');
        const status = this.getRowValue(row, 'Status');
        const email = this.getRowValue(row, 'Email');
        const lastLogin = this.getRowValue(row, 'Last Login');
        const cohort = this.getRowValue(row, 'Cohort Name');
        
        return {
            UserID: userID ? parseInt(userID) : null,
            FirstName: firstName,
            LastName: lastName,
            LoginName: login || '',
            Status: status ? status.toLowerCase() === 'active' : false,
            Email: email || '',
            LastLogin: lastLogin ? new Date(lastLogin).toISOString() : null,
            CohortName: cohort || ''
        };
    }
    
    static extractProgressData(row) {
        const progressData = {};
        
        MODULE_COLUMNS.forEach(module => {
            const value = this.getRowValue(row, module);
            if (value !== undefined && value !== null && value !== '') {
                const numValue = parseInt(value);
                progressData[module] = isNaN(numValue) ? null : numValue;
            } else {
                progressData[module] = null;
            }
        });
        
        return progressData;
    }
    
    static validateRow(row) {
        const login = this.getRowValue(row, 'Login');
        const email = this.getRowValue(row, 'Email');
        const name = this.getRowValue(row, 'Name');
        
        if (!login || !email || !name) {
            return { 
                valid: false, 
                error: `Login, Email və ya Name məlumatı boşdur (Login: "${login}", Email: "${email}", Name: "${name}")` 
            };
        }
        
        return { valid: true };
    }
}
