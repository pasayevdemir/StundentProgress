// Review Model
class ReviewModel {
    static async getByStudentId(studentId, limit = null) {
        let query = supabaseClient
            .from('Review')
            .select(`
                *,
                Students!Review_ReviewerID_fkey(FirstName, LastName)
            `)
            .eq('StudentID', studentId)
            .order('WriteDate', { ascending: false });
        
        if (limit) {
            query = query.limit(limit);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    }
    
    static async getLastWeekReviews(studentId) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const { data, error } = await supabaseClient
            .from('Review')
            .select(`
                *,
                Students!Review_ReviewerID_fkey(FirstName, LastName)
            `)
            .eq('StudentID', studentId)
            .gte('WriteDate', oneWeekAgo.toISOString())
            .order('WriteDate', { ascending: false });
        
        if (error) throw error;
        return data;
    }
    
    static async create(reviewData) {
        const { data, error } = await supabaseClient
            .from('Review')
            .insert(reviewData)
            .select();
        
        if (error) throw error;
        return data;
    }
    
    static async getTodayReviews() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data, error } = await supabaseClient
            .from('Review')
            .select('StudentID')
            .gte('WriteDate', today.toISOString())
            .lt('WriteDate', tomorrow.toISOString());
        
        if (error) throw error;
        return data;
    }
    
    // Helper to get Baku date boundaries
    static getBakuBoundaries() {
        // Baku is UTC+4
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Baku',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const map = new Map(parts.map(p => [p.type, p.value]));
        
        const year = parseInt(map.get('year'));
        const month = parseInt(map.get('month')) - 1;
        const day = parseInt(map.get('day'));
        
        // Baku 00:00:00 = UTC - 4 hours
        const startOfTodayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0) - (4 * 60 * 60 * 1000));
        
        const weekAgoUTC = new Date(startOfTodayUTC);
        weekAgoUTC.setDate(weekAgoUTC.getDate() - 7);
        
        const monthAgoUTC = new Date(startOfTodayUTC);
        monthAgoUTC.setMonth(monthAgoUTC.getMonth() - 1);
        
        const endOfTodayUTC = new Date(startOfTodayUTC);
        endOfTodayUTC.setDate(endOfTodayUTC.getDate() + 1);
        
        return {
            today: startOfTodayUTC,
            tomorrow: endOfTodayUTC,
            weekAgo: weekAgoUTC,
            monthAgo: monthAgoUTC
        };
    }

    // Get all reviews with reviewer info for statistics (No Limit)
    static async getAllReviews() {
        let allData = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabaseClient
                .from('Review')
                .select(`
                    *,
                    Reviewer:Students!Review_ReviewerID_fkey(ID, FirstName, LastName),
                    Student:Students!Review_StudentID_fkey(ID, FirstName, LastName)
                `)
                .order('WriteDate', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                allData = [...allData, ...data];
                if (data.length < pageSize) hasMore = false;
                page++;
            } else {
                hasMore = false;
            }
        }
        return allData;
    }
    
    // Get statistics summary (Asia/Baku)
    static async getStatistics() {
        const boundaries = this.getBakuBoundaries();
        
        // Fetch counts using count aggregation to bypass row limits
        const [
            { count: totalCount, error: totalError },
            { count: todayCount, error: todayError },
            { count: weekCount, error: weekError },
            { count: monthCount, error: monthError }
        ] = await Promise.all([
            supabaseClient.from('Review').select('*', { count: 'exact', head: true }),
            supabaseClient.from('Review').select('*', { count: 'exact', head: true })
                .gte('WriteDate', boundaries.today.toISOString())
                .lt('WriteDate', boundaries.tomorrow.toISOString()),
            supabaseClient.from('Review').select('*', { count: 'exact', head: true })
                .gte('WriteDate', boundaries.weekAgo.toISOString()),
            supabaseClient.from('Review').select('*', { count: 'exact', head: true })
                .gte('WriteDate', boundaries.monthAgo.toISOString())
        ]);
        
        if (totalError) throw totalError;
        
        return {
            total: totalCount || 0,
            today: todayCount || 0,
            thisWeek: weekCount || 0,
            thisMonth: monthCount || 0
        };
    }
    
    // Get reviewer statistics (Asia/Baku & No Limit)
    static async getReviewerStats() {
        const allData = await this.getAllReviews(); // Uses the unlimited fetcher
        const boundaries = this.getBakuBoundaries();
        const startOfToday = boundaries.today.getTime();
        const endOfToday = boundaries.tomorrow.getTime();
        
        // Group by reviewer
        const reviewerMap = new Map();
        
        allData.forEach(review => {
            const reviewerId = review.ReviewerID;
            if (!reviewerMap.has(reviewerId)) {
                reviewerMap.set(reviewerId, {
                    id: reviewerId,
                    name: review.Reviewer ? `${review.Reviewer.FirstName} ${review.Reviewer.LastName}` : 'Naməlum',
                    totalReviews: 0,
                    todayReviews: 0,
                    lastReviewDate: null
                });
            }
            
            const reviewer = reviewerMap.get(reviewerId);
            reviewer.totalReviews++;
            
            const reviewDate = new Date(review.WriteDate).getTime();
            if (reviewDate >= startOfToday && reviewDate < endOfToday) {
                reviewer.todayReviews++;
            }
            
            if (!reviewer.lastReviewDate || reviewDate > new Date(reviewer.lastReviewDate).getTime()) {
                reviewer.lastReviewDate = review.WriteDate;
            }
        });
        
        return Array.from(reviewerMap.values()).sort((a, b) => {
            if (b.todayReviews !== a.todayReviews) return b.todayReviews - a.todayReviews;
            return b.totalReviews - a.totalReviews;
        });
    }
}
