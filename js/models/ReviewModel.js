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
}
