// Student Model
class StudentModel {
    static async getAll(activeOnly = true) {
        const query = supabaseClient
            .from('Students')
            .select('*')
            .eq('Status', true);
        
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
        // Validate required fields
        if (!studentData.LoginName || !studentData.Email) {
            throw new Error('LoginName və Email zorunludur');
        }
        
        // First, check if student exists by LoginName
        const existing = await this.getByLoginName(studentData.LoginName);
        
        if (existing) {
            // Update existing student
            const { data, error } = await supabaseClient
                .from('Students')
                .update(studentData)
                .eq('ID', existing.ID)
                .select();
            
            if (error) throw new Error(`Update failed: ${error.message}`);
            return data || [];
        } else {
            // Insert new student
            const { data, error } = await supabaseClient
                .from('Students')
                .insert(studentData)
                .select();
            
            if (error) throw new Error(`Insert failed: ${error.message}`);
            return data || [];
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
