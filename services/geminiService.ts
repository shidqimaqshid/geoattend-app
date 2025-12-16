import { GoogleGenAI } from "@google/genai";
import { Coordinates } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface SearchResult {
  name: string;
  address: string;
  coordinates: Coordinates;
}

// Search for a location using Gemini Maps Grounding to add to our "Database"
export const searchOfficeLocation = async (query: string): Promise<SearchResult | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the precise location details for: ${query}. return the name, address, and coordinates.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks && chunks.length > 0) {
      // Look for a chunk with maps data
      // Note: The structure varies, but we look for retrieval metadata usually or extract from text if grounding is robust
      // However, specific lat/lng extraction from text is safer if grounding chunk is complex.
      // Let's rely on the text response for parsing structured data if the tool was effective,
      // or try to find metadata.
      
      // Since the API returns grounding metadata, we sometimes have to parse the text generated which uses that metadata.
      // Let's ask Gemini to format it as JSON in the text to make it easy, even with the tool.
      
      const jsonResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Based on this query "${query}", use Google Maps to find the place. 
        Output ONLY a valid JSON object with keys: "name", "address", "latitude" (number), "longitude" (number). 
        Do not use markdown code blocks.`,
        config: {
            tools: [{ googleMaps: {} }],
        }
      });
      
      const text = jsonResponse.text.trim().replace(/```json/g, '').replace(/```/g, '');
      const data = JSON.parse(text);
      
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
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `What place or building is located at latitude ${coords.latitude} and longitude ${coords.longitude}? Be concise.`,
            config: {
                tools: [{ googleMaps: {} }],
            }
        });
        return response.text;
    } catch (error) {
        console.error("Verification error", error);
        return "Could not verify location context.";
    }
}
