import { GoogleGenAI, Type, Part } from "@google/genai";
import { PatientInfo, ReligiousTreatments } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePrescription = async (
  patientInfo: PatientInfo,
  illnessDescription: string,
  selectedTreatments: string[],
  files: Part[]
): Promise<{ illnessTitle: string; prescriptionContent: string; advice: string; }> => {
  
  const { language } = patientInfo;
  const model = 'gemini-2.5-flash';
  const hasFiles = files.length > 0;

  // Instructions are now language-agnostic.
  const religiousTreatmentPrompts: { [key: string]: string } = {
    [ReligiousTreatments.Islam]: `- For "${ReligiousTreatments.Islam}", provide relevant Quranic verses or duas, and recommend 'tasbeeh' (recitation) of Asma-ul-Husna relevant to healing. Use bullet points. If the target language is Urdu, this MUST be in Urdu script.`,
    [ReligiousTreatments.Christianity]: `- For "${ReligiousTreatments.Christianity}", provide relevant Bible verses and suggest prayers. Use bullet points.`,
    [ReligiousTreatments.Hinduism]: `- For "${ReligiousTreatments.Hinduism}", provide relevant Ayurvedic remedies and suggest healing mantras. Use bullet points.`,
    [ReligiousTreatments.Buddhism]: `- For "${ReligiousTreatments.Buddhism}", suggest meditation techniques and healing chants or sutras. Use bullet points.`,
    [ReligiousTreatments.Sikhism]: `- For "${ReligiousTreatments.Sikhism}", recommend reciting Shabads from the Gurbani and suggest 'Seva' (selfless service). Use bullet points.`,
    [ReligiousTreatments.Judaism]: `- For "${ReligiousTreatments.Judaism}", provide relevant passages from the Torah or Psalms and suggest prayers. Use bullet points.`,
    [ReligiousTreatments["Baháʼí Faith"]]: `- For "${ReligiousTreatments["Baháʼí Faith"]}", provide excerpts from the Writings of Baháʼu'lláh and suggest prayers for health. Use bullet points.`,
    [ReligiousTreatments["Chinese Folk Religion"]]: `- For "${ReligiousTreatments["Chinese Folk Religion"]}", suggest practices like ancestral offerings and common herbal remedies. Use bullet points.`,
    [ReligiousTreatments.Spiritism]: `- For "${ReligiousTreatments.Spiritism}", provide spiritual counsel and suggest practices like positive affirmations. Use bullet points.`,
    [ReligiousTreatments["Ethnic/Indigenous Religions"]]: `- For "${ReligiousTreatments["Ethnic/Indigenous Religions"]}", suggest connecting with nature and general traditional rituals. Use bullet points.`,
  };

  // Build dynamic rules for selected religious treatments
  const religiousRules = selectedTreatments
    .map(treatment => religiousTreatmentPrompts[treatment])
    .filter(Boolean); // This filters out any non-religious treatments


  const prompt = `
    You are an expert AI medical advisor. Your task is to provide concise, safe, and professional recommendations.

    **PRIMARY LANGUAGE RULE:**
    - You MUST generate the ENTIRE response in **${language}**. This includes all headings, titles, medical terms, treatment plans, analysis, and advice. Translate everything accurately and naturally.

    **FORMATTING RULES:**
    - For **Allopathy (Specialist Doctors)**, act as a board-certified specialist for the specific condition. Prescribe a comprehensive, high-quality, and modern treatment plan. Include primary medications, any necessary supportive therapies (e.g., vitamins, antacids), and suggest relevant diagnostic tests if needed. Use the format: \`Medicine Name, Dosage (e.g., 500mg, 1+1+1), Duration (e.g., 5 days)\`. List each item on a new bullet point (*). Ensure the prescription is evidence-based and professional.
    - For **Homeopathy**, use this format: \`Medicine Name Potency, Dosage (e.g., 5+5+5 drops), Duration (e.g., 7 days)\`. New bullet point (*) per medicine. No paragraphs.
    - For **Hikmat**, use simple bullet points with brief descriptions.
    ${religiousRules.join('\n            ')}

    **Patient Information:**
    - Name: ${patientInfo.name}
    - Age: ${patientInfo.age}
    - District: ${patientInfo.district}
    - Religion: ${patientInfo.religion}
    - Preferred Language: ${language}
    ${patientInfo.cell ? `- Cell: ${patientInfo.cell}` : ''}

    ${hasFiles ?
      `**User Comments on Reports:**
      "${illnessDescription}"` :
      `**Illness Description:**
      "${illnessDescription}"`
    }
    
    ${hasFiles ?
      `
      **Task:**
      Based on the provided information and reports, perform these tasks in ${language}:
      1.  **Create Illness Title:** Create a short title for the issue (max 5 words).
      2.  **Analyze Reports:** Create a level 2 heading "Report Analysis Summary" (translated to ${language}). List **ONLY abnormal findings** in bullet points. Do not mention normal results.
      3.  **Provide Treatment Opinion:** Provide plans for the selected methodologies: **${selectedTreatments.join(', ')}**. Base these on report findings and user comments, following all rules.
      4.  **Provide General Advice:** Create a final section with a level 2 heading "General Advice" (translated to ${language}). Provide a bulleted list of health advice and precautions.

      **Response Structure:**
      - The 'prescriptionContent' value MUST start with the 'Report Analysis Summary' section.
      - The 'advice' value MUST contain the 'General Advice' section.
      ` :
      `
      **Task:**
      Based on the provided information, perform these tasks in ${language}:
      1.  **Create Illness Title:** Create a short title for the illness (max 4 words).
      2.  **Provide Treatment Plans:** Provide plans for the selected methodologies: **${selectedTreatments.join(', ')}**. Follow all rules.
      3.  **Provide General Advice:** Create a final section with a level 2 heading "General Advice" (translated to ${language}). Provide a bulleted list of health advice and precautions.

      **Response Structure:**
      - The 'prescriptionContent' value MUST contain a level 2 heading for each treatment type (e.g., "Homeopathy Prescription"), translated to ${language}.
      - The 'advice' value MUST contain the 'General Advice' section.
      `
    }
    `;

  try {
    const textPart = { text: prompt };
    const contentParts: Part[] = [textPart, ...files];

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: contentParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                illnessTitle: {
                    type: Type.STRING,
                    description: "A short, concise title for the illness or report finding, written in the requested language."
                },
                prescriptionContent: {
                    type: Type.STRING,
                    description: "The detailed prescription content in Markdown, including analysis and treatments, written in the requested language."
                },
                advice: {
                    type: Type.STRING,
                    description: "A bulleted list of general advice in Markdown with a translated 'General Advice' heading, written in the requested language."
                }
            },
            required: ["illnessTitle", "prescriptionContent", "advice"]
        }
      }
    });

    // The response text is a JSON string, so we parse it.
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating prescription:", error);
    throw new Error("Failed to get a response from the AI. Please try again.");
  }
};