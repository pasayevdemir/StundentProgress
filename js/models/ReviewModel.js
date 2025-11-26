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
    
    // Get all reviews with reviewer info for statistics
    static async getAllReviews() {
        const { data, error } = await supabaseClient
            .from('Review')
            .select(`
                *,
                Reviewer:Students!Review_ReviewerID_fkey(ID, FirstName, LastName),
                Student:Students!Review_StudentID_fkey(ID, FirstName, LastName)
            `)
            .order('WriteDate', { ascending: false });
        
        if (error) throw error;
        return data;
    }
    
    // Get statistics summary
    static async getStatistics() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);
        
        // Get all reviews
        const { data: allReviews, error: allError } = await supabaseClient
            .from('Review')
            .select('ID, WriteDate, ReviewerID');
        
        if (allError) throw allError;
        
        // Calculate statistics
        const todayReviews = allReviews.filter(r => {
            const date = new Date(r.WriteDate);
            return date >= today && date < tomorrow;
        });
        
        const weekReviews = allReviews.filter(r => {
            const date = new Date(r.WriteDate);
            return date >= weekAgo;
        });
        
        const monthReviews = allReviews.filter(r => {
            const date = new Date(r.WriteDate);
            return date >= monthAgo;
        });
        
        return {
            total: allReviews.length,
            today: todayReviews.length,
            thisWeek: weekReviews.length,
            thisMonth: monthReviews.length,
            allReviews: allReviews
        };
    }
    
    // Get reviewer statistics
    static async getReviewerStats() {
        const { data, error } = await supabaseClient
            .from('Review')
            .select(`
                ReviewerID,
                WriteDate,
                Reviewer:Students!Review_ReviewerID_fkey(ID, FirstName, LastName)
            `);
        
        if (error) throw error;
        
        // Group by reviewer
        const reviewerMap = new Map();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        data.forEach(review => {
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
            
            const reviewDate = new Date(review.WriteDate);
            if (reviewDate >= today && reviewDate < tomorrow) {
                reviewer.todayReviews++;
            }
            
            if (!reviewer.lastReviewDate || reviewDate > new Date(reviewer.lastReviewDate)) {
                reviewer.lastReviewDate = review.WriteDate;
            }
        });
        
        return Array.from(reviewerMap.values()).sort((a, b) => b.totalReviews - a.totalReviews);
    }
}
