import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const smartSearch = async (query: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Search for products or shops in Korba related to: ${query}. Provide a helpful summary.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return response.text;
};

export const findNearbyShops = async (lat: number, lng: number) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Find popular grocery shops or dark stores near coordinates ${lat}, ${lng} in Korba, Chhattisgarh.`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng,
          },
        },
      },
    },
  });
  return response.text;
};

export const complexReasoning = async (prompt: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
    },
  });
  return response.text;
};
