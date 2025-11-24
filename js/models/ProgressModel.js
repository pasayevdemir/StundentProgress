// Progress Model
class ProgressModel {
    static async getLatestByStudentId(studentId) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .order('CreatedAt', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
    
    static async getLatestByProgressDate(studentId) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .order('ProgressDate', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
    
    static async getProgressByDate(studentId, progressDate) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .eq('ProgressDate', progressDate)
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
    
    static async getClosestProgressBeforeDate(studentId, targetDate) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .lt('ProgressDate', targetDate)
            .order('ProgressDate', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
    
    static async getByStudentIdAndDateRange(studentId, startDate, endDate) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .gte('CreatedAt', startDate)
            .lte('CreatedAt', endDate)
            .order('CreatedAt', { ascending: false });
        
        if (error) throw error;
        return data;
    }
    
    static async create(progressData) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .insert(progressData)
            .select();
        
        if (error) throw error;
        return data;
    }
    
    static async getTodaysProgress(studentId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .gte('CreatedAt', today.toISOString())
            .lt('CreatedAt', tomorrow.toISOString())
            .order('CreatedAt', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
    }
    
    static async updateTodaysProgress(studentId, progressData) {
        const todayProgress = await this.getTodaysProgress(studentId);
        
        if (todayProgress) {
            // Update existing
            const { data, error } = await supabaseClient
                .from('Progresses')
                .update(progressData)
                .eq('ID', todayProgress.ID)
                .select();
            
            if (error) throw error;
            return data;
        } else {
            // Create new
            return await this.create({
                StudentID: studentId,
                ...progressData
            });
        }
    }
    
    static async upsertByDate(studentId, progressDate, progressData) {
        // Check if progress exists for this student on this specific date
        const { data: existing, error: selectError } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .eq('ProgressDate', progressDate)
            .limit(1);
        
        if (selectError) throw selectError;
        
        if (existing && existing.length > 0) {
            // Update existing progress
            const { data, error } = await supabaseClient
                .from('Progresses')
                .update(progressData)
                .eq('ID', existing[0].ID)
                .select();
            
            if (error) throw error;
            return data;
        } else {
            // Create new progress
            return await this.create({
                StudentID: studentId,
                ...progressData
            });
        }
    }
    
    static calculateDifference(currentProgress, previousProgress) {
        if (!previousProgress) return null;
        
        const differences = {};
        MODULE_COLUMNS.forEach(module => {
            // Skip if current value is NULL/undefined
            if (currentProgress[module] === null || currentProgress[module] === undefined) {
                return;
            }
            
            const current = currentProgress[module];
            const previous = previousProgress[module] !== null && previousProgress[module] !== undefined 
                ? previousProgress[module] 
                : 0; // If previous was NULL, treat as 0 (starting point)
            
            const diff = current - previous;
            
            if (diff !== 0) {
                differences[module] = {
                    current,
                    previous,
                    difference: diff,
                    percentage: previous > 0 ? ((diff / previous) * 100).toFixed(1) : 'N/A'
                };
            }
        });
        
        return differences;
    }
}
