import { GoogleGenAI, Type } from "@google/genai";
import { Coordinates } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface SearchResult {
  name: string;
  address: string;
  coordinates: Coordinates;
}

// Search for a location using Gemini to add to our "Database"
export const searchOfficeLocation = async (query: string): Promise<SearchResult | null> => {
  try {
    // Fix: Using gemini-3-flash-preview with responseSchema for reliable structured location data.
    // Guidelines forbid manual JSON parsing when using googleMaps tool.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the precise location details (name, full address, and coordinates) for: ${query}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            address: { type: Type.STRING },
            latitude: { type: Type.NUMBER },
            longitude: { type: Type.NUMBER },
          },
          required: ["name", "address", "latitude", "longitude"],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    
    if (data.name && data.latitude && data.longitude) {
      return {
        name: data.name,
        address: data.address,
        coordinates: {
            latitude: data.latitude,
            longitude: data.longitude
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return null;
  }
};

export const verifyLocationContext = async (coords: Coordinates): Promise<string> => {
    try {
        // Fix: Use gemini-flash-lite-latest (a 2.5 series model alias) for Maps Grounding tasks as per coding guidelines.
        const response = await ai.models.generateContent({
            model: "gemini-flash-lite-latest",
            contents: `What place or building is located at latitude ${coords.latitude} and longitude ${coords.longitude}? Be concise.`,
            config: {
                tools: [{ googleMaps: {} }],
            }
        });
        // Note: groundingMetadata.groundingChunks contains map URLs which should be rendered in UI.
        return response.text || "Could not verify location context.";
    } catch (error) {
        console.error("Verification error", error);
        return "Could not verify location context.";
    }
}
