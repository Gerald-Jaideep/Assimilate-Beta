import { GoogleGenAI, Type } from "@google/genai";
import { uploadBase64Image } from "./storageService";
import { MEDICAL_SPECIALIZATIONS } from "../constants/specializations";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

// Use Gemini 3 for text tasks
const TEXT_MODEL = "gemini-3-flash-preview";
// Use Gemini 3.1 for general stable clinical visuals (High quality)
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

export async function generateCalendarEvents(): Promise<any[]> {
  try {
    if (!process.env.GEMINI_API_KEY) return [];

    const prompt = `Generate a comprehensive JSON array of significant medical awareness days and major national holidays for the year 2026.
    Target Countries: India (IN), USA (US), UAE (AE), Australia (AU).
    Include global medical days (e.g., World Health Day, World Heart Day).
    
    Minimum 40 entries.
    
    JSON Schema Requirements:
    - name: Event name (e.g. "Republic Day", "World Autism Awareness Day")
    - type: must be either "medical" or "holiday"
    - date: ISO date string "YYYY-MM-DD"
    - country: One of ["IN", "US", "AE", "AU", "Global"]
    - icon: Single emoji visually representing the event.
    
    Return ONLY the raw JSON array.`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              date: { type: Type.STRING },
              country: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["name", "type", "date", "country", "icon"]
          }
        }
      }
    });

    const text = response.text || '[]';
    console.log("Calendar AI Response:", text);
    return JSON.parse(text);
  } catch (err) {
    console.error("AI Calendar Sync Error:", err);
    return [];
  }
}

export interface MockCase {
  title: string;
  subtitle: string;
  description: string;
  summary: string;
  speakerName: string;
  presenterBio: string;
  presenterCountry?: string;
  presenterQualifications?: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  languages: string[];
  accreditation: { points: number; type: string };
  transcript: string;
  status: 'published' | 'draft';
  specialty?: string;
}

// Map tailwind colors to descriptive photographic palettes
const COLOR_PALETTES: Record<string, string> = {
  indigo: "Deep Navy, Electric Indigo, and Clinical White",
  amber: "Warm Amber, Honey Gold, and Soft Sun-lit Professional Office",
  rose: "Medical Red, Soft Pink, and High-contrast Crimson",
  blue: "Steel Blue, Royal Azure, and Pristine White",
  cyan: "Cyan, Sky Blue, and Bright Clinical Lighting",
  emerald: "Surgical Green, Emerald, and Teal Accents",
  purple: "Deep Purple, Ultraviolet, and High-tech Digital Violet",
  violet: "Soft Lavender, Violet, and Royal Purple Gradient",
  pink: "Fuchsia, Pink, and Soft Rose",
  fuchsia: "Fuchsia, Bright Pink, and Magenta",
  orange: "Medical Orange, Burnt Sienna, and Warm Professional Glow",
  slate: "Grey Slate, Graphite, and Charcoal Clinical Textures",
  sky: "Clear Sky Blue, Cerulean, and Bright Sunlight",
  yellow: "Bright Yellow, Goldenrod, and High-visibility Accents",
  red: "Emergency Red, Crimson, and High-definition Blood Tones",
  teal: "Teal, Turquoise, and Deep Sea Green",
  lime: "Lime Green, Acid Green, and Fresh Clinical Energy",
  darkred: "Deep Maroon, Dark Red, and Surgical Crimson",
  zinc: "Zinc Gray, Silver, and Brushed Metal Textures",
  darkblue: "Midnight Blue, Dark Azure, and Professional Depth",
  stone: "Earth Gray, Stone, and Neutral Professional Tones",
  brown: "Warm Brown, Tan, and Sepia Clinical Lighting"
};

export async function generateCaseImage(title: string, description: string, specialty: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Gemini API key missing for image generation");
    return null;
  }

  const spec = MEDICAL_SPECIALIZATIONS.find(s => s.name === specialty);
  const palette = spec ? (COLOR_PALETTES[spec.color] || "Professional Blue and Clinical Gray") : "Professional Blue and Clinical Gray";

  const prompt = `A professional, ultra-realistic high-resolution clinical medical photograph for a medical case.
  TOPIC: ${title}
  CONTEXT: ${description.slice(0, 200)}
  
  Visual Strategy: strictly realistic medical photography, as seen in professional clinical journals or high-end diagnostic displays. 
  Focus on technical clinical details.
  
  MANDATORY CONSTRAINTS:
  1. ABSOLUTELY NO TEXT, labels, letters, or words.
  2. PHOTOREALISTIC photography only. No illustrations.
  3. NO HUMAN FACES. Clinical attire only.
  
  COLOR SCHEME: ${palette}.
  TECHNICAL: High depth of field, sharp focus, cinematic lighting.`;

  try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
          ] as any,
        }
      });

      if (!response.candidates?.[0]?.content?.parts) {
         throw new Error("No candidates returned from Image AI");
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64 = part.inlineData.data;
          const fileName = `case_thumbs/${Date.now()}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}.png`;
          return await uploadBase64Image(base64, fileName);
        }
      }
      
      throw new Error("No inlineData found in Image AI response.");
  } catch (error: any) {
    console.error("Image generation failed:", error);
    const errorMessage = error?.message?.toLowerCase() || '';
    
    if (errorMessage.includes('502') || errorMessage.includes('504') || errorMessage.includes('gateway') || errorMessage.includes('html')) {
       return `https://images.unsplash.com/photo-1584362944585-17d30c3330ea?auto=format&fit=crop&q=80&w=1280`; 
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      throw new Error("AI Image Quota reached. Please use manual upload for this case.");
    }
    
    return `https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80&w=1280`;
  }
}

export async function generateDummyCases(count: number = 4): Promise<MockCase[]> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return getFallbackCases(count);
    }

    const availableSpecialties = MEDICAL_SPECIALIZATIONS.map(s => s.name);

    const specialtiesForPrompt = availableSpecialties.sort(() => 0.5 - Math.random()).slice(0, 20);

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: `Generate ${count} highly realistic, professional medical case presentation details.
      
      For EACH case, pick exactly one specialty from this list: ${specialtiesForPrompt.join(', ')}.
      
      Requirements:
      - title: Academic yet engaging clinical title (e.g., "Management of Refractory Hypertension in Type 2 Diabetes").
      - subtitle: Brief technical summary focusing on clinical challenges.
      - description: A detailed clinical narrative (2-3 paragraphs) including patient presentation, diagnostic findings, and specific management dilemmas.
      - summary: A concise executive summary with key learning take-away.
      - speakerName: A realistic professional name with appropriate pre/post-nominals (e.g., "Dr. Sarah Chen, MD, PhD").
      - presenterBio: Professional background, institutional affiliation, and clinical focus.
      - transcript: A scripted opening (300+ words) of how the speaker introduces the case.
      - accreditationPoints: A realistic number between 0.25 and 1.5.
      - specialty: Must be EXACTly from the provided list.
      
      Ensure each case is distinct in tone and medical focus. Return as a valid JSON array.` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              description: { type: Type.STRING },
              summary: { type: Type.STRING },
              speakerName: { type: Type.STRING },
              presenterBio: { type: Type.STRING },
              transcript: { type: Type.STRING },
              accreditationPoints: { type: Type.NUMBER },
              specialty: { type: Type.STRING }
            },
            required: ["title", "subtitle", "description", "summary", "speakerName", "presenterBio", "transcript", "accreditationPoints", "specialty"]
          }
        }
      }
    });

    const rawCases = JSON.parse(response.text || '[]');
    
    const casesWithImages = await Promise.all(rawCases.map(async (c: any, i: number) => {
      const imageUrl = await generateCaseImage(c.title, c.description, c.specialty);
      return {
        ...c,
        status: 'published',
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: imageUrl || `https://picsum.photos/seed/case_${i}/1280/720`,
        duration: '26:39',
        languages: ['English', 'Hindi'],
        accreditation: { points: c.accreditationPoints, type: 'ACCME Accredited' }
      };
    }));

    return casesWithImages;
  } catch (error: any) {
    console.error("Gemini service failed:", error);
    const errorMessage = error?.message?.toLowerCase() || '';
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      throw new Error("AI Quota reached. Generation paused to protect your limits. Please try again in a minute.");
    }
    return getFallbackCases(count);
  }
}

function getFallbackCases(count: number): MockCase[] {
  const defaults = [
    { 
      title: "Psychological and Behavioral Effects of GLP-1 and GIP Agonists",
      subtitle: "Weight Loss: A Comprehensive Review",
      description: "This case analysis explores the impact of GLP-1 and GIP agonists on appetite, satiety, and behavioral responses in obese patients.",
      summary: "Significant public health implications for metabolic disorders. Prevlance rising to 24% by 2035.",
      speakerName: "Dr. Alisson Barbosa Silva",
      presenterBio: "Professor of Surgery, UNIME School of Medicine. Expert in enteral nutrition and patient outcomes.",
      transcript: "In this session, we will explore the neurobiological pathways affected by dual agonists...",
      accreditationPoints: 0.65,
      specialty: "Endocrinology"
    }
  ];

  return defaults.slice(0, count).map((c, i) => ({
    ...c,
    status: 'published',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: `https://picsum.photos/seed/case_fallback_${i}/1280/720`,
    duration: '18:50',
    languages: ['English', 'Spanish'],
    accreditation: { points: c.accreditationPoints, type: 'ACCME Accredited' }
  }));
}
