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
    
    static async getClosestProgressAfterDate(studentId, targetDate) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .gte('ProgressDate', targetDate)
            .order('ProgressDate', { ascending: true })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
    
    static async getEarliestProgress(studentId) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('*')
            .eq('StudentID', studentId)
            .order('ProgressDate', { ascending: true })
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
    
    // Modules to exclude from leaderboard calculations (no tasks, reading only)
    static EXCLUDED_MODULES = ['Onboarding'];
    
    // Get modules that count for leaderboard
    static getLeaderboardModules() {
        return MODULE_COLUMNS.filter(module => !this.EXCLUDED_MODULES.includes(module));
    }
    
    // Calculate total progress across all modules (cumulative completion)
    // Excludes Onboarding as it has no tasks
    static calculateTotalProgress(progress) {
        if (!progress) return { totalProgress: 0, moduleCount: 0, completedModules: 0 };
        
        const leaderboardModules = this.getLeaderboardModules();
        let totalProgress = 0;
        let moduleCount = 0;
        let completedModules = 0;
        
        leaderboardModules.forEach(module => {
            const value = progress[module];
            if (value !== null && value !== undefined) {
                totalProgress += value;
                moduleCount++;
                if (value >= 100) {
                    completedModules++;
                }
            }
        });
        
        return {
            totalProgress: totalProgress,
            moduleCount: moduleCount,
            completedModules: completedModules,
            // Total possible is leaderboardModules * 100 (excluding Onboarding)
            maxPossible: leaderboardModules.length * 100,
            totalModules: leaderboardModules.length
        };
    }
    
    // Get the earliest progress date for a student (their start date)
    static async getStudentStartDate(studentId) {
        const { data, error } = await supabaseClient
            .from('Progresses')
            .select('ProgressDate, CreatedAt')
            .eq('StudentID', studentId)
            .order('ProgressDate', { ascending: true })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        
        // Use ProgressDate if available, otherwise CreatedAt
        return data.ProgressDate || data.CreatedAt;
    }
    
    // Calculate months since student started
    static calculateMonthsInProgram(startDate) {
        if (!startDate) return 0;
        
        const start = new Date(startDate);
        const now = new Date();
        
        const months = (now.getFullYear() - start.getFullYear()) * 12 + 
                       (now.getMonth() - start.getMonth());
        
        // Add partial month based on days
        const daysDiff = now.getDate() - start.getDate();
        const partialMonth = daysDiff / 30;
        
        return Math.max(0, months + partialMonth);
    }
    
    // Expected progress based on time in program
    // Curriculum is roughly:
    // Month 1-2: Onboarding + Preseason (2 modules) - ~10% of total
    // Month 3-4: Season 01 (3 modules) - ~15% of total  
    // Month 5-8: Season 02 (2 modules) - ~10% of total
    // Month 9-14: Season 03 (13 modules) - ~60% of total
    // Month 15+: Season 04 Masters - ~5% of total
    // Total: 21 modules = 2100 points max
    static calculateExpectedProgress(monthsInProgram) {
        // Expected progress percentage based on months
        // This is cumulative expected progress
        if (monthsInProgram <= 0) return 0;
        
        // Define expected monthly progress rate
        // Students should complete roughly 5-7% of total curriculum per month
        // With 20 modules at 100 points each = 2000 total points (excluding Onboarding)
        // Expected rate: ~100 points per month (about 1 module per month on average)
        
        const leaderboardModules = this.getLeaderboardModules();
        const expectedMonthlyProgress = 100; // 100 points = 1 module per month
        const maxProgress = leaderboardModules.length * 100; // 2000 (20 modules)
        
        const expectedProgress = monthsInProgram * expectedMonthlyProgress;
        
        // Cap at max possible
        return Math.min(expectedProgress, maxProgress);
    }
    
    // Calculate performance ratio: actual vs expected
    static calculatePerformanceRatio(actualProgress, expectedProgress) {
        if (expectedProgress <= 0) return 100; // New student, no expectations yet
        
        return (actualProgress / expectedProgress) * 100;
    }
    
    // Get performance level based on actual vs expected progress ratio
    static getPerformanceLevel(performanceRatio) {
        if (performanceRatio >= 120) {
            return { level: 'better', label: 'Əla', color: '#10b981', icon: '🌟' };
        } else if (performanceRatio >= 90) {
            return { level: 'good', label: 'Yaxşı', color: '#3b82f6', icon: '👍' };
        } else if (performanceRatio >= 70) {
            return { level: 'normal', label: 'Normal', color: '#f59e0b', icon: '📊' };
        } else if (performanceRatio >= 50) {
            return { level: 'weak', label: 'Zəif', color: '#f97316', icon: '⚠️' };
        } else {
            return { level: 'very-weak', label: 'Çox Zəif', color: '#ef4444', icon: '🔴' };
        }
    }
    
    // Get all students with their performance levels based on time-adjusted calculation
    static async getAllStudentsWithPerformance() {
        const students = await StudentModel.getAll();
        
        const studentsWithPerformance = await Promise.all(
            students.map(async (student) => {
                const progress = await this.getLatestByStudentId(student.ID);
                const startDate = await this.getStudentStartDate(student.ID);
                
                // Calculate actual progress
                const { totalProgress, moduleCount, completedModules, maxPossible } = 
                    this.calculateTotalProgress(progress);
                
                // Calculate time in program
                const monthsInProgram = this.calculateMonthsInProgram(startDate);
                
                // Calculate expected progress based on time
                const expectedProgress = this.calculateExpectedProgress(monthsInProgram);
                
                // Calculate performance ratio
                const performanceRatio = this.calculatePerformanceRatio(totalProgress, expectedProgress);
                
                // Get performance level
                const performance = this.getPerformanceLevel(performanceRatio);
                
                return {
                    ...student,
                    progress,
                    startDate: startDate,
                    monthsInProgram: monthsInProgram,
                    totalProgress: totalProgress,
                    expectedProgress: expectedProgress,
                    performanceRatio: performanceRatio,
                    completedModules: completedModules,
                    activeModuleCount: moduleCount,
                    performance
                };
            })
        );
        
        // Sort by performance ratio descending, then by completed modules descending (best performers first)
        return studentsWithPerformance.sort((a, b) => {
            // Use integer comparison (floor) to treat same percentage as equal
            const aRatio = Math.floor(a.performanceRatio);
            const bRatio = Math.floor(b.performanceRatio);
            if (bRatio !== aRatio) {
                return bRatio - aRatio;
            }
            // When same percentage, sort by completed modules
            return b.completedModules - a.completedModules;
        });
    }
}
