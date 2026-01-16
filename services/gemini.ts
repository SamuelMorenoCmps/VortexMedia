import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Helper to get AI instance - creates new instance to ensure key is fresh
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLink = async (url: string): Promise<AnalysisResult> => {
  try {
    const ai = getAI();
    const prompt = `
      Analiza la siguiente URL: "${url}".
      1. Identifica la plataforma (YouTube, Instagram, TikTok, Spotify, etc.).
      2. Determina si es un enlace a un contenido individual O a una PLAYLIST/Álbum/Lista.
         (Pistas: 'list=', 'album/', 'playlist/', 'set/').
      3. Genera un resumen breve.
      4. Si es YouTube, intenta construir la miniatura (hqdefault.jpg).

      Responde SOLO con JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            platform: { type: Type.STRING },
            isValid: { type: Type.BOOLEAN },
            summary: { type: Type.STRING },
            contentType: { type: Type.STRING, enum: ['video', 'audio', 'image', 'unknown'] },
            thumbnailUrl: { type: Type.STRING },
            isPlaylist: { type: Type.BOOLEAN, description: "True if the URL is a playlist, album, or collection of media." }
          },
          required: ["platform", "isValid", "summary", "contentType", "isPlaylist"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No response text");
  } catch (error) {
    console.error("Error analyzing link:", error);
    return {
      platform: "Desconocida",
      isValid: false,
      summary: "No pudimos identificar este enlace.",
      contentType: "unknown",
      isPlaylist: false
    };
  }
};

export const generateVideo = async (prompt: string, resolution: string = '720p', aspectRatio: string = '16:9'): Promise<string | null> => {
  try {
    const ai = getAI();
    
    // Check for polling loop
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (uri) {
        // Append API Key as per documentation requirements for download
        return `${uri}&key=${process.env.API_KEY}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
};