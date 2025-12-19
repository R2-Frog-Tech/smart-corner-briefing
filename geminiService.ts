
import { GoogleGenAI } from "@google/genai";
import { BriefingData, Language } from "../types";

export const generateProjectSummary = async (data: BriefingData, lang: Language): Promise<string> => {
  // Always obtain the API key exclusively from process.env.API_KEY
  if (!process.env.API_KEY) return "AI Summary unavailable: Missing API Key.";

  // Initialize client with named parameter apiKey
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    // Query GenAI with both the model name and prompt using ai.models.generateContent
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    // Extract generated text using the .text property (not a method)
    return response.text || "Summary generation failed.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The system could not generate a summary, but your data has been sent.";
  }
};
