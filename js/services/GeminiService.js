// Gemini AI Service - Handles API calls with model fallback
class GeminiService {
    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        
        // Models ordered from best to worst
        this.models = [
            'gemini-2.5-pro',
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite'
        ];
        
        this.currentModelIndex = 0;
        this.modelStatus = {};
    }

    setApiKey(key) {
        this.apiKey = key;
        if (key) {
            localStorage.setItem('gemini_api_key', key);
        }
    }

    getApiKey() {
        return this.apiKey || localStorage.getItem('gemini_api_key');
    }

    hasApiKey() {
        return !!this.getApiKey();
    }

    getCurrentModel() {
        return this.models[this.currentModelIndex];
    }

    async testConnection() {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            return { success: false, error: 'API açarı təyin edilməyib' };
        }

        const availableModels = [];
        
        for (const model of this.models) {
            try {
                const response = await fetch(
                    `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: 'Hello' }] }],
                            generationConfig: { maxOutputTokens: 10 }
                        })
                    }
                );

                if (response.ok) {
                    availableModels.push(model);
                    this.modelStatus[model] = 'available';
                } else {
                    const error = await response.json();
                    if (error.error?.status === 'RESOURCE_EXHAUSTED') {
                        this.modelStatus[model] = 'limited';
                    } else {
                        this.modelStatus[model] = 'unavailable';
                    }
                }
            } catch (error) {
                this.modelStatus[model] = 'unavailable';
            }
        }

        if (availableModels.length > 0) {
            return { success: true, availableModels };
        } else {
            return { success: false, error: 'Heç bir model mövcud deyil. API açarını yoxlayın.' };
        }
    }

    async generateContent(prompt, systemPrompt = null) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API açarı təyin edilməyib. Tənzimləmələrdən API açarını daxil edin.');
        }

        // Try each model starting from the best
        for (let i = this.currentModelIndex; i < this.models.length; i++) {
            const model = this.models[i];
            
            try {
                const result = await this.callModel(model, prompt, systemPrompt);
                this.currentModelIndex = i; // Remember which model worked
                return result;
            } catch (error) {
                console.warn(`Model ${model} failed:`, error.message);
                
                // If rate limited, try next model
                if (error.message.includes('RESOURCE_EXHAUSTED') || 
                    error.message.includes('429') ||
                    error.message.includes('quota')) {
                    this.modelStatus[model] = 'limited';
                    continue;
                }
                
                // For other errors, also try next model
                if (i === this.models.length - 1) {
                    throw error; // Last model failed, throw error
                }
            }
        }

        throw new Error('Bütün modellər məşğuldur. Bir az sonra yenidən cəhd edin.');
    }

    async callModel(model, prompt, systemPrompt) {
        const apiKey = this.getApiKey();
        
        const requestBody = {
            contents: [{ 
                parts: [{ text: prompt }] 
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                thinkingConfig: {
                    thinkingBudget: 0
                }
            }
        };

        // Add system instruction if provided
        if (systemPrompt) {
            requestBody.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }

        const response = await fetch(
            `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            const errorMessage = error.error?.message || 'API xətası';
            const errorStatus = error.error?.status || response.status;
            throw new Error(`${errorStatus}: ${errorMessage}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error('API cavab vermədi');
        }

        return {
            text: data.candidates[0].content.parts[0].text,
            model: model
        };
    }

    async optimizeReviewText(text, fieldType) {
        const systemPrompt = `You are a professional educational reviewer assistant.

TASK: Optimize and improve the given text while keeping it in its ORIGINAL LANGUAGE.

RULES:
1. Keep the text in the SAME LANGUAGE it was written in (Azerbaijani, English, etc.)
2. Make it more professional, clear, and well-structured
3. Fix grammar and spelling mistakes
4. PRESERVE THE EXACT MEANING - do not change positive to negative or vice versa
5. If the text says something negative (like "didn't learn anything", "no progress"), keep it negative
6. If the text says something positive, keep it positive

IMPORTANT: 
- Only return the optimized text, nothing else
- Do not translate to another language
- Do not include any explanations or meta-commentary
- Do not soften or change negative feedback into positive
- Be honest and accurate`;

        const prompt = `Optimize this text professionally. Keep it in the SAME LANGUAGE. PRESERVE THE EXACT MEANING:\n\n${text}`;

        return await this.generateContent(prompt, systemPrompt);
    }

    async optimizeAllReviewTexts(learned, today, feedback) {
        const systemPrompt = `You are a professional educational reviewer assistant.

TASK: Optimize and improve the given texts while keeping them in their ORIGINAL LANGUAGE.

RULES:
1. Keep each text in the SAME LANGUAGE it was written in (Azerbaijani, English, etc.)
2. Make them more professional, clear, and well-structured
3. Fix grammar and spelling mistakes
4. PRESERVE THE EXACT MEANING - do not change positive to negative or vice versa
5. If the text says something negative, keep it negative
6. If the text says something positive, keep it positive

IMPORTANT: 
- Return ONLY a valid JSON object with exactly this format: {"learned": "...", "today": "...", "feedback": "..."}
- Do not translate to another language - keep original language
- Do not include any explanations, markdown, or code blocks
- Do not soften or change negative feedback into positive`;

        const prompt = `Optimize these three texts professionally. Keep each in its ORIGINAL LANGUAGE. Return ONLY a JSON object with keys "learned", "today", "feedback".

LEARNED (what student has learned so far):
${learned}

TODAY (what student will work on today):
${today}

FEEDBACK (general feedback):
${feedback}`;

        const result = await this.generateContent(prompt, systemPrompt);
        
        // Parse JSON from response
        try {
            // Clean up response - remove markdown code blocks if present
            let jsonText = result.text.trim();
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
            }
            
            const parsed = JSON.parse(jsonText);
            return {
                learned: parsed.learned || '',
                today: parsed.today || '',
                feedback: parsed.feedback || '',
                model: result.model
            };
        } catch (e) {
            console.error('Failed to parse AI response as JSON:', result.text);
            throw new Error('AI cavabı düzgün formatda deyil. Yenidən cəhd edin.');
        }
    }

    // Reset model index to try from best model again
    resetModelIndex() {
        this.currentModelIndex = 0;
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.GeminiService = GeminiService;
}
