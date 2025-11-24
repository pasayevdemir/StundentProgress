// Student Model
class StudentModel {
    static async getAll(activeOnly = true) {
        const query = supabaseClient
            .from('Students')
            .select('*');
        
        if (activeOnly) {
            query.eq('Status', true);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    }
    
    static async getById(id) {
        const { data, error } = await supabaseClient
            .from('Students')
            .select('*')
            .eq('ID', id)
            .single();
        
        if (error) throw error;
        return data;
    }
    
    static async upsert(studentData) {
        // First, check if student exists by LoginName
        const existing = await this.getByLoginName(studentData.LoginName);
        
        if (existing) {
            // Update existing student
            const { data, error } = await supabaseClient
                .from('Students')
                .update(studentData)
                .eq('ID', existing.ID)
                .select();
            
            if (error) throw error;
            return data;
        } else {
            // Insert new student
            const { data, error } = await supabaseClient
                .from('Students')
                .insert(studentData)
                .select();
            
            if (error) throw error;
            return data;
        }
    }
    
    static async getByLoginName(loginName) {
        const { data, error } = await supabaseClient
            .from('Students')
            .select('*')
            .eq('LoginName', loginName)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
}
