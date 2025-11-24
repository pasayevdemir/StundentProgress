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
        const { data, error } = await supabaseClient
            .from('Students')
            .upsert(studentData, { 
                onConflict: 'LoginName',
                ignoreDuplicates: false 
            })
            .select();
        
        if (error) throw error;
        return data;
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
