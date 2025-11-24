// Reviewer Model
class ReviewerModel {
    static async getByAuthId(authId) {
        const { data, error } = await supabaseClient
            .from('Reviewer')
            .select('*')
            .eq('AuthID', authId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
    
    static async getStudentIdByAuthId(authId) {
        const reviewer = await this.getByAuthId(authId);
        if (reviewer) return reviewer.StudentID;
        
        // Fallback: check Students table
        const { data, error } = await supabaseClient
            .from('Students')
            .select('ID')
            .eq('UserID', authId);
        
        if (error) throw error;
        return data && data.length > 0 ? data[0].ID : null;
    }
}
