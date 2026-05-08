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

export async function generateCalendarEvents(): Promise<any[]> {
  try {
    const response = await fetch('/api/ai/calendar');
    if (!response.ok) throw new Error('AI Sync Failed');
    return await response.json();
  } catch (err) {
    console.error("Client AI Calendar Error:", err);
    return [];
  }
}

export async function generateCaseImage(title: string, description: string, specialty: string): Promise<string | null> {
  try {
    const response = await fetch('/api/ai/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, specialty })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.url;
  } catch (err) {
    console.error("Client AI Image Error:", err);
    return null;
  }
}

export async function generateDummyCases(count: number = 4): Promise<MockCase[]> {
  try {
    const response = await fetch(`/api/ai/dummy-cases?count=${count}`);
    if (!response.ok) throw new Error('AI Generation Failed');
    return await response.json();
  } catch (err) {
    console.error("Client AI Dummy Cases Error:", err);
    return [];
  }
}
