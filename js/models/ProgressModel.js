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
    
    // Modules to exclude from leaderboard calculations (no tasks, reading only)
    static EXCLUDED_MODULES = ['Onboarding'];
    
    // Get modules that count for leaderboard (all except Onboarding)
    static getLeaderboardModules() {
        return MODULE_COLUMNS.filter(module => !this.EXCLUDED_MODULES.includes(module));
    }
    
    // Get modules with defined durations for performance calculation
    static getModulesWithDurations() {
        return MODULE_COLUMNS.filter(module => MODULE_DURATIONS[module] !== null);
    }
    
    // Get the sequential timeline of modules with durations
    // Returns array of { module, duration, startMonth, endMonth }
    static getModuleTimeline() {
        const modulesWithDurations = this.getModulesWithDurations();
        let currentMonth = 0;
        
        return modulesWithDurations.map(module => {
            const duration = MODULE_DURATIONS[module];
            const startMonth = currentMonth;
            const endMonth = currentMonth + duration;
            currentMonth = endMonth;
            
            return {
                module,
                duration,
                startMonth,
                endMonth
            };
        });
    }
    
    // Calculate total progress across all modules (cumulative completion)
    // If forLeaderboard is true, only count modules with defined durations
    static calculateTotalProgress(progress, forLeaderboard = false) {
        if (!progress) return { totalProgress: 0, moduleCount: 0, completedModules: 0 };
        
        const modules = forLeaderboard ? this.getModulesWithDurations() : this.getLeaderboardModules();
        let totalProgress = 0;
        let moduleCount = 0;
        let completedModules = 0;
        
        modules.forEach(module => {
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
            maxPossible: modules.length * 100,
            totalModules: modules.length
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
    
    // Expected progress based on time in program using sequential module timeline
    // Each module has a defined duration in MODULE_DURATIONS
    // Modules with null duration are excluded from calculation
    static calculateExpectedProgress(monthsInProgram) {
        if (monthsInProgram <= 0) return 0;
        
        const timeline = this.getModuleTimeline();
        let expectedProgress = 0;
        
        timeline.forEach(({ module, startMonth, endMonth }) => {
            if (monthsInProgram >= endMonth) {
                // Module should be 100% complete based on time
                expectedProgress += 100;
            } else if (monthsInProgram > startMonth) {
                // Module is in progress - calculate partial expected completion
                const timeInModule = monthsInProgram - startMonth;
                const moduleDuration = endMonth - startMonth;
                const percentComplete = (timeInModule / moduleDuration) * 100;
                expectedProgress += percentComplete;
            }
            // If monthsInProgram <= startMonth, module hasn't started yet (0 expected)
        });
        
        return expectedProgress;
    }
    
    // Calculate completion percentage: actual vs max possible
    // This gives a simple percentage of how much curriculum is completed
    static calculateCompletionPercentage(actualProgress, maxPossible) {
        if (maxPossible <= 0) return 0;
        return (actualProgress / maxPossible) * 100;
    }
    
    // Calculate performance ratio: actual vs expected (for badge coloring)
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
                
                // Calculate actual progress (forLeaderboard = true to only count modules with durations)
                const { totalProgress, moduleCount, completedModules, maxPossible } = 
                    this.calculateTotalProgress(progress, true);
                
                // Calculate time in program
                const monthsInProgram = this.calculateMonthsInProgram(startDate);
                
                // Calculate expected progress based on time
                const expectedProgress = this.calculateExpectedProgress(monthsInProgram);
                
                // Calculate performance ratio (for badge coloring - ahead/behind schedule)
                const performanceRatio = this.calculatePerformanceRatio(totalProgress, expectedProgress);
                
                // Calculate completion percentage (for display and ranking)
                const completionPercentage = this.calculateCompletionPercentage(totalProgress, maxPossible);
                
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
                    completionPercentage: completionPercentage,
                    completedModules: completedModules,
                    activeModuleCount: moduleCount,
                    performance
                };
            })
        );
        
        // Sort by completion percentage descending (most progress = highest rank)
        // This ensures students who completed more modules rank higher
        return studentsWithPerformance.sort((a, b) => b.completionPercentage - a.completionPercentage);
    }
}
