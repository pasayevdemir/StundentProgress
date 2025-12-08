// CSV Upload Controller
class CSVUploadController {
    constructor() {
        this.uploadResults = {
            success: 0,
            failed: 0,
            errors: []
        };
        this.studentsCache = new Map(); // Cache students by LoginName
    }
    
    async handleFileUpload(file) {
        UIHelper.showLoader(true);
        this.uploadResults = { success: 0, failed: 0, errors: [] };
        this.studentsCache.clear();
        
        try {
            // Extract date from filename: peerstack-academy_students_progress_DD_MM_YY.csv
            const progressDate = this.extractDateFromFilename(file.name);
            console.log(`CSV fayl tarixi: ${progressDate}`);
            
            const text = await file.text();
            const { rows } = CSVParser.parseCSV(text);
            
            console.log(`CSV yükləndi: ${rows.length} sətir tapıldı`);
            
            // Pre-load all students for faster lookup
            const allStudents = await StudentModel.getAll(false);
            allStudents.forEach(student => {
                this.studentsCache.set(student.LoginName, student);
            });
            console.log(`${allStudents.length} tələbə cache-ə yükləndi`);
            
            // Pre-load existing progresses for this date
            this.existingProgressMap = await this.loadExistingProgresses(progressDate);
            console.log(`${this.existingProgressMap.size} mövcud progress tapıldı`);
            
            // Process in batches for better performance
            const batchSize = 50; // Process 50 rows at a time
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                const batchPromises = batch.map(async (row, index) => {
                    const rowNum = i + index + 2; // +2 because row 1 is header
                    const validation = CSVParser.validateRow(row);
                    
                    if (!validation.valid) {
                        this.uploadResults.failed++;
                        this.uploadResults.errors.push(`Sətir ${rowNum}: ${validation.error}`);
                        return;
                    }
                    
                    try {
                        await this.processRow(row, progressDate);
                        this.uploadResults.success++;
                    } catch (error) {
                        this.uploadResults.failed++;
                        this.uploadResults.errors.push(`Sətir ${rowNum}: ${error.message}`);
                        console.error(`Sətir ${rowNum} xətası:`, error);
                    }
                });
                
                await Promise.all(batchPromises);
            }
            
            UIHelper.showLoader(false);
            this.showResults();
            
        } catch (error) {
            UIHelper.showLoader(false);
            console.error('CSV yükləmə xətası:', error);
            UIHelper.showNotification('CSV faylı yüklənə bilmədi: ' + error.message, 'error');
        }
    }
    
    async processRow(row, progressDate) {
        // 1. Tələbə məlumatını çıxart
        const studentData = CSVParser.extractStudentData(row);
        
        // 2. Cache-dən tələbəni tap
        let student = this.studentsCache.get(studentData.LoginName);
        
        if (!student) {
            // Yeni tələbə yarat
            try {
                const result = await StudentModel.upsert(studentData);
                student = result[0];
                
                if (!student || !student.ID) {
                    throw new Error(`Tələbə yaradıla bilmədi (LoginName: ${studentData.LoginName})`);
                }
                
                // Cache-ə əlavə et
                this.studentsCache.set(student.LoginName, student);
            } catch (error) {
                throw new Error(`Tələbə yaradıla bilmədi: ${error.message}`);
            }
        }
        
        // 3. Progress məlumatını çıxart
        const progressData = CSVParser.extractProgressData(row);
        progressData.StudentID = student.ID;
        progressData.ProgressDate = progressDate;
        
        // 4. Check if progress exists in cache
        const existingProgress = this.existingProgressMap.get(student.ID);
        
        if (existingProgress) {
            // Update existing
            const { error } = await supabaseClient
                .from('Progresses')
                .update(progressData)
                .eq('ID', existingProgress.ID);
            
            if (error) throw error;
        } else {
            // Insert new
            const { error } = await supabaseClient
                .from('Progresses')
                .insert(progressData);
            
            if (error) throw error;
        }
    }
    
    async loadExistingProgresses(progressDate) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('ProgressDate', progressDate);
        
        if (error) {
            console.error('Mövcud progress-lər yüklənə bilmədi:', error);
            return new Map();
        }
        
        const map = new Map();
        if (data) {
            data.forEach(progress => {
                map.set(progress.StudentID, progress);
            });
        }
        return map;
    }
    
    extractDateFromFilename(filename) {
        // Format: peerstack-academy_students_progress_DD_MM_YY.csv
        const match = filename.match(/_(\d{2})_(\d{2})_(\d{2})\.csv$/);
        
        if (!match) {
            console.warn('Fayl adından tarix çıxarıla bilmədi, bu günün tarixi istifadə olunacaq');
            return new Date().toISOString().split('T')[0];
        }
        
        const [, day, month, year] = match;
        const fullYear = 2000 + parseInt(year); // 25 -> 2025
        
        // Create date in YYYY-MM-DD format
        return `${fullYear}-${month}-${day}`;
    }
    
    showResults() {
        const message = `Yükləmə tamamlandı!\nUğurlu: ${this.uploadResults.success}\nUğursuz: ${this.uploadResults.failed}`;
        
        if (this.uploadResults.errors.length > 0) {
            console.warn('Xətalar:', this.uploadResults.errors);
        }
        
        UIHelper.showNotification(message, this.uploadResults.failed > 0 ? 'warning' : 'success');
        
        // Note: Manual page refresh needed to see new students
        // Auto-refresh disabled to avoid unnecessary table fetches
    }
}
