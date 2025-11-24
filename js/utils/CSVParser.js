// CSV Parser Utility
class CSVParser {
    static parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV faylı boşdur və ya yanlış formatdadır');
        
        const headers = lines[0].split('\t').map(h => h.trim());
        const rows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : null;
            });
            
            rows.push(row);
        }
        
        return { headers, rows };
    }
    
    static extractStudentData(row) {
        const nameParts = row['Name'] ? row['Name'].split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        return {
            UserID: row['User ID'] ? parseInt(row['User ID']) : null,
            FirstName: firstName,
            LastName: lastName,
            LoginName: row['Login'] || '',
            Status: row['Status'] ? row['Status'].toLowerCase() === 'active' : false,
            Email: row['Email'] || '',
            LastLogin: row['Last Login'] ? new Date(row['Last Login']).toISOString() : null,
            CohortName: row['Cohort Name'] || ''
        };
    }
    
    static extractProgressData(row) {
        const progressData = {};
        
        MODULE_COLUMNS.forEach(module => {
            if (row[module] !== undefined && row[module] !== null && row[module] !== '') {
                const value = parseInt(row[module]);
                progressData[module] = isNaN(value) ? null : value;
            } else {
                progressData[module] = null;
            }
        });
        
        return progressData;
    }
    
    static validateRow(row) {
        if (!row['Login'] || !row['Email'] || !row['Name']) {
            return { valid: false, error: 'Login, Email və ya Name məlumatı yoxdur' };
        }
        return { valid: true };
    }
}
