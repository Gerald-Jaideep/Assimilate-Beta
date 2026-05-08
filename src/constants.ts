export interface Specialty {
  name: string;
  color: string;
}

export const SPECIALTIES: Record<string, Specialty> = {
  "Internal Medicine": { name: "Internal Medicine", color: "#4F46E5" }, // Indigo
  "Cardiology": { name: "Cardiology", color: "#EF4444" }, // Red
  "Neurology": { name: "Neurology", color: "#8B5CF6" }, // Violet
  "Pulmonology": { name: "Pulmonology", color: "#3B82F6" }, // Blue
  "Gastroenterology": { name: "Gastroenterology", color: "#F59E0B" }, // Amber
  "Gynaecology and Obstetrics": { name: "Gynaecology and Obstetrics", color: "#EC4899" }, // Pink
  "Imaging": { name: "Imaging", color: "#6B7280" }, // Gray
  "Mental Health": { name: "Mental Health", color: "#10B981" }, // Emerald
  "Rehabilitation": { name: "Rehabilitation", color: "#6366F1" }, // Indigo-Light
  "Nephrology": { name: "Nephrology", color: "#14B8A6" }, // Teal
  "Endocrinology": { name: "Endocrinology", color: "#F97316" }, // Orange
  "Cardiopulmonary": { name: "Cardiopulmonary", color: "#EF4444" }, // Red
  "Oncology": { name: "Oncology", color: "#7C3AED" }, // Purple
  "Pediatrics": { name: "Pediatrics", color: "#FBBF24" }, // Yellow
  "Orthopedics": { name: "Orthopedics", color: "#92400E" }, // Brown
  "Dermatology": { name: "Dermatology", color: "#FBCFE8" }, // Light Pink
  "Dentistry & Oral Surgery": { name: "Dentistry & Oral Surgery", color: "#78716C" }, // Stone
  "Anesthesiology & Pain Medicine": { name: "Anesthesiology & Pain Medicine", color: "#71717A" }, // Zinc
  "Occupational Medicine": { name: "Occupational Medicine", color: "#F97316" }, // Orange
  "Nutrition & Dietetics": { name: "Nutrition & Dietetics", color: "#84CC16" }, // Lime
  "General Practice": { name: "General Practice", color: "#3B82F6" }, // Blue
};

export interface Country {
  name: string;
  code: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: "India", code: "IN", flag: "🇮🇳" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
  { name: "Australia", code: "AU", flag: "🇦🇺" },
  { name: "Canada", code: "CA", flag: "🇨🇦" },
  { name: "Singapore", code: "SG", flag: "🇸🇬" },
  { name: "Germany", code: "DE", flag: "🇩🇪" },
  { name: "France", code: "FR", flag: "🇫🇷" },
  { name: "Spain", code: "ES", flag: "🇪🇸" },
  { name: "Brazil", code: "BR", flag: "🇧🇷" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  { name: "Kenya", code: "KE", flag: "🇰🇪" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾" },
  { name: "Philippines", code: "PH", flag: "🇵🇭" },
  { name: "Egypt", code: "EG", flag: "🇪🇬" },
  { name: "Mexico", code: "MX", flag: "🇲🇽" },
  { name: "Japan", code: "JP", flag: "🇯🇵" },
];

export const getCountryFlag = (countryName: string) => {
  return COUNTRIES.find(c => c.name === countryName)?.flag || "🏳️";
};

export const getSpecialtyColor = (specialtyName: string) => {
  return SPECIALTIES[specialtyName]?.color || "#6B7280";
};
