
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CV_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidateName: { type: Type.STRING },
    contactInfo: {
      type: Type.OBJECT,
      properties: {
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        linkedIn: { type: Type.STRING },
        location: { type: Type.STRING }
      },
      required: ["email", "phone"]
    },
    summary: { type: Type.STRING },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          degree: { type: Type.STRING },
          institution: { type: Type.STRING },
          year: { type: Type.STRING }
        },
        required: ["degree", "institution"]
      }
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          company: { type: Type.STRING },
          duration: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["role", "company", "highlights"]
      }
    },
    skills: {
      type: Type.OBJECT,
      properties: {
        technical: { type: Type.ARRAY, items: { type: Type.STRING } },
        soft: { type: Type.ARRAY, items: { type: Type.STRING } },
        languages: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["technical", "soft", "languages"]
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        scoringBreakdown: {
          type: Type.OBJECT,
          properties: {
            experienceScore: { type: Type.NUMBER, description: "Score for experience overlap, max 50" },
            experienceJustification: { type: Type.STRING, description: "Justification for the experience score" },
            languageScore: { type: Type.NUMBER, description: "Score for language overlap, max 15" },
            languageJustification: { type: Type.STRING, description: "Justification for the language score" },
            skillsScore: { type: Type.NUMBER, description: "Score for skills overlap, max 20" },
            skillsJustification: { type: Type.STRING, description: "Justification for the skills score" },
            educationScore: { type: Type.NUMBER, description: "Score for education overlap, max 15" },
            educationJustification: { type: Type.STRING, description: "Justification for the education score" }
          },
          required: [
            "experienceScore", "experienceJustification", 
            "languageScore", "languageJustification", 
            "skillsScore", "skillsJustification", 
            "educationScore", "educationJustification"
          ]
        },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        jobFit: { 
          type: Type.STRING, 
          description: "Must be one of: 'Very Poor Fit', 'Poor Fit', 'Moderate / Partial Fit', 'Good Fit', 'Excellent / Strong Fit'" 
        },
        matchReason: { type: Type.STRING }
      },
      required: ["score", "scoringBreakdown", "strengths", "suggestions", "jobFit", "matchReason"]
    }
  },
  required: ["candidateName", "contactInfo", "summary", "education", "experience", "skills", "analysis"]
};

export const analyzeResume = async (
  fileData: string | null,
  mimeType: string | null,
  vacancyName: string,
  jobDescription: string,
  fileName: string,
  jdFileData?: string,
  jdMimeType?: string,
  rawText?: string,
  jdRawText?: string
): Promise<ResumeData> => {
  const maxRetries = 3;
  let retryCount = 0;

  const execute = async (): Promise<ResumeData> => {
    try {
      const parts: any[] = [];

      if (fileData && mimeType) {
        parts.push({
          inlineData: {
            data: fileData,
            mimeType: mimeType,
          },
        });
      } else if (rawText) {
        parts.push({
          text: `Candidate Resume Content:\n${rawText}`,
        });
      }

      if (jdFileData && jdMimeType) {
        parts.push({
          inlineData: {
            data: jdFileData,
            mimeType: jdMimeType,
          },
        });
      } else if (jdRawText) {
        parts.push({
          text: `Job Description Content:\n${jdRawText}`,
        });
      }

      parts.push({
        text: `Act as a senior technical recruiter. 
        Analyze the resume for the position of "${vacancyName}".
        ${(jdFileData || jdRawText) ? "The Job Description is provided as an attachment." : `Job Description: ${jobDescription}`}

        Scoring Criteria (Total 100%):
        1. Experience Overlap (Working Area): 50% weight. (Max 50 points)
        2. Language Overlap: 15% weight. (Max 15 points)
        3. Skills Overlap: 20% weight. (Max 20 points)
        4. Education Overlap: 15% weight. (Max 15 points)

        Instructions:
        - Extract the candidate's full name and contact info.
        - Provide a summary of their profile.
        - Calculate the score based on the weighted criteria above. 
        - CRITICAL: Avoid "rounded" or "average" numbers (like 35, 40, 45). Be extremely granular and precise. Use the full range of points (e.g., 37.4, 41.2, 11.7). Every point should reflect a specific nuance in the match.
        - Provide the breakdown for each category in the scoringBreakdown object, including a detailed justification for each score explaining WHY that specific grade was given.
        - The total score must be the exact sum of the breakdown scores.
        - Categorize the "jobFit" strictly into one of these: "Very Poor Fit", "Poor Fit", "Moderate / Partial Fit", "Good Fit", "Excellent / Strong Fit".
        - Identify 3+ specific strengths and 3+ suggestions for this specific role.
        - Return valid JSON matching the schema.`
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            parts: parts,
          },
        ],
        config: {
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          responseSchema: CV_ANALYSIS_SCHEMA,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("AI returned empty content. Check file format or size.");
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;
      
      const parsedData = JSON.parse(cleanJson);
      return { ...parsedData, fileName };
    } catch (error: any) {
      const isRateLimit = error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED" || (typeof error === 'string' && error.includes("429"));
      
      if (isRateLimit && retryCount < maxRetries) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 2000; // 4s, 8s, 16s
        console.warn(`Rate limit hit for ${fileName}. Retrying in ${delay}ms (Attempt ${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return execute();
      }
      
      console.error(`Gemini Error for ${fileName}:`, error);
      throw error;
    }
  };

  return execute();
};
