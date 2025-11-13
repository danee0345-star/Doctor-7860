
export interface PatientInfo {
  name: string;
  age: string;
  district: string;
  cell: string;
  religion: string;
  language: string;
}

export enum TreatmentType {
  Hikmat = "Hikmat (Traditional Herbal)",
  Homeopathy = "Homeopathy",
  SpecialistDoctors = "Allopathy (Specialist Doctors)",
}

export const ReligiousTreatments: { [key: string]: string } = {
  Islam: "Quran & Asma-ul-Husna",
  Christianity: "Biblical Healing & Prayer",
  Hinduism: "Ayurveda & Mantras",
  Buddhism: "Meditation & Chanting",
  Sikhism: "Gurbani Recitation & Seva",
  Judaism: "Torah Study & Prayer",
  "Baháʼí Faith": "Writings of Baháʼu'lláh & Prayer",
  "Chinese Folk Religion": "Ancestral Veneration & Herbal Remedies",
  Spiritism: "Spiritual Counsel & Healing",
  "Ethnic/Indigenous Religions": "Traditional Rituals & Natural Healing",
};

// Represents the structure for a file part to be sent to the Gemini API
export type FilePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};