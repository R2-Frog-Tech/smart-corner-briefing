
import { GoogleGenAI } from "@google/genai";
import { BriefingData, Language } from "../types";

export const generateProjectSummary = async (data: BriefingData, lang: Language): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "AI Summary unavailable: Missing API Key.";

  const ai = new GoogleGenAI({ apiKey });
  
  const langMap: Record<Language, string> = {
    en: 'English',
    es: 'Spanish',
    pl: 'Polish'
  };

  const prompt = `
    Analyze this creative briefing and generate a professional summary in ${langMap[lang]}.
    Project: ${data.details.projectName}
    Description: ${data.details.description}
    Services: ${data.services.join(', ')}
    Budget: ${data.timeline.budgetRange}
    
    Format:
    1. Need analysis.
    2. Technical recommendations.
    3. Suggested next steps.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Summary generation failed.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The system could not generate a summary, but your data has been sent.";
  }
};
