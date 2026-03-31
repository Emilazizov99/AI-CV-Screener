
export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface Experience {
  role: string;
  company: string;
  duration: string;
  highlights: string[];
}

export interface Analysis {
  score: number;
  scoringBreakdown: {
    experienceScore: number; // max 50
    experienceJustification: string;
    languageScore: number;   // max 15
    languageJustification: string;
    skillsScore: number;     // max 20
    skillsJustification: string;
    educationScore: number;  // max 15
    educationJustification: string;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  jobFit: string;
  matchReason: string;
}

export interface ResumeData {
  candidateName: string;
  fileName: string; // Added to track which file the report belongs to
  contactInfo: {
    email: string;
    phone: string;
    linkedIn?: string;
    location?: string;
  };
  summary: string;
  education: Education[];
  experience: Experience[];
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  analysis: Analysis;
}

export interface AppState {
  isProcessing: boolean;
  reports: ResumeData[];
  error: string | null;
  processingFile: string | null;
  vacancyName: string;
  jobDescription: string;
  jdFile: File | null;
  selectedFiles: File[]; // New: Queue of files to be processed
}
