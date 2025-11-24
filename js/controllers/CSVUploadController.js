// CSV Upload Controller
class CSVUploadController {
    constructor() {
        this.uploadResults = {
            success: 0,
            failed: 0,
            errors: []
        };
    }
    
    async handleFileUpload(file) {
        UIHelper.showLoader(true);
        this.uploadResults = { success: 0, failed: 0, errors: [] };
        
        try {
            const text = await file.text();
            const { rows } = CSVParser.parseCSV(text);
            
            console.log(`CSV yükləndi: ${rows.length} sətir tapıldı`);
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const validation = CSVParser.validateRow(row, i + 1);
                
                if (!validation.valid) {
                    this.uploadResults.failed++;
                    this.uploadResults.errors.push(`Sətir ${i + 2}: ${validation.error}`);
                    continue;
                }
                
                try {
                    await this.processRow(row);
                    this.uploadResults.success++;
                } catch (error) {
                    this.uploadResults.failed++;
                    this.uploadResults.errors.push(`Sətir ${i + 2}: ${error.message}`);
                    console.error(`Sətir ${i + 2} xətası:`, error);
                }
            }
            
            UIHelper.showLoader(false);
            this.showResults();
            
        } catch (error) {
            UIHelper.showLoader(false);
            console.error('CSV yükləmə xətası:', error);
            UIHelper.showNotification('CSV faylı yüklənə bilmədi: ' + error.message, 'error');
        }
    }
    
    async processRow(row) {
        // 1. Tələbə məlumatını çıxart
        const studentData = CSVParser.extractStudentData(row);
        
        // 2. Tələbəni tap və ya yarat
        let student = await StudentModel.getByLoginName(studentData.LoginName);
        
        if (student) {
            // Mövcud tələbəni yenilə
            await supabaseClient
                .from('Students')
                .update(studentData)
                .eq('ID', student.ID);
        } else {
            // Yeni tələbə yarat
            const result = await StudentModel.upsert(studentData);
            student = result[0];
        }
        
        // 3. Progress məlumatını çıxart
        const progressData = CSVParser.extractProgressData(row);
        progressData.StudentID = student.ID;
        
        // 4. Bu günün progressini yenilə və ya yarat
        await ProgressModel.updateTodaysProgress(student.ID, progressData);
    }
    
    showResults() {
        const message = `Yükləmə tamamlandı!\nUğurlu: ${this.uploadResults.success}\nUğursuz: ${this.uploadResults.failed}`;
        
        if (this.uploadResults.errors.length > 0) {
            console.warn('Xətalar:', this.uploadResults.errors);
        }
        
        UIHelper.showNotification(message, this.uploadResults.failed > 0 ? 'warning' : 'success');
        
        // Refresh students list
        if (window.reviewController) {
            window.reviewController.loadStudents();
        }
    }
}
