// Technical Presentation Model
class TechnicalPresentationModel {
    static async create(presentationData) {
        const { data, error } = await supabaseClient
            .from('TechnicalPresentations')
            .insert(presentationData)
            .select();
        
        if (error) throw error;
        return data;
    }

    static async getByStudentId(studentId) {
        const { data, error } = await supabaseClient
            .from('TechnicalPresentations')
            .select(`
                *,
                Reviewer:ReviewerID (
                    FirstName,
                    LastName
                )
            `)
            .eq('StudentID', studentId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    static async getAll() {
        const { data, error } = await supabaseClient
            .from('TechnicalPresentations')
            .select(`
                *,
                Reviewer:ReviewerID (
                    FirstName,
                    LastName
                ),
                Student:StudentID (
                    FirstName,
                    LastName,
                    Email
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    static async getById(id) {
        const { data, error } = await supabaseClient
            .from('TechnicalPresentations')
            .select(`
                *,
                Reviewer:ReviewerID (
                    FirstName,
                    LastName
                ),
                Student:StudentID (
                    FirstName,
                    LastName,
                    Email
                )
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    }

    static calculateTotalScore(presentation) {
        const sum = (
            presentation.TimeManagement +
            presentation.PresentationSkill +
            presentation.SlidePreparation +
            presentation.TopicCoverage +
            presentation.Progress +
            presentation.SlideDesign
        );
        return (sum / 6).toFixed(1); // Average of 6 categories
    }

    static getScoreLevel(avgScore) {
        // Average max: 10
        const percentage = (avgScore / 10) * 100;
        
        if (percentage >= 90) return { level: 'excellent', label: 'Əla', color: '#10b981' };
        if (percentage >= 75) return { level: 'good', label: 'Yaxşı', color: '#3b82f6' };
        if (percentage >= 60) return { level: 'average', label: 'Orta', color: '#f59e0b' };
        if (percentage >= 40) return { level: 'weak', label: 'Zəif', color: '#ef4444' };
        return { level: 'very-weak', label: 'Çox Zəif', color: '#991b1b' };
    }
}
