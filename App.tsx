import React, { useState, useRef } from 'react';
import { PatientInfo, TreatmentType, FilePart, ReligiousTreatments } from './types';
import { generatePrescription } from './services/geminiService';
import { AIDoctorLogoIcon, LoadingIcon, UploadCloudIcon, DocumentIcon, TrashIcon } from './components/icons';
import { Prescription } from './components/Prescription';

type PrescriptionData = {
  illnessTitle: string;
  prescriptionContent: string;
  advice: string;
};

const supportedLanguages = [
  'English', 'Mandarin Chinese', 'Hindi', 'Spanish', 'French', 
  'Arabic', 'Bengali', 'Portuguese', 'Russian', 'Urdu'
];

const App: React.FC = () => {
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({ name: '', age: '', district: '', cell: '', religion: '', language: 'English' });
  const [symptomDescription, setSymptomDescription] = useState<string>('');
  const [reportComments, setReportComments] = useState<string>('');
  const [selectedTreatments, setSelectedTreatments] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'upload'>('text');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- File Handling ---
  const fileToPart = async (file: File): Promise<FilePart> => {
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
    return {
        inlineData: {
            mimeType: file.type,
            data: base64,
        },
    };
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => 
      ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) && file.size < 10 * 1024 * 1024 // 10MB limit
    );
    
    if (validFiles.length !== newFiles.length) {
        setError("Some files were invalid. Only JPG, PNG, and PDF files under 10MB are accepted.");
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
  };
  
  const preventDefaults = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragEnter = (e: React.DragEvent) => {
    preventDefaults(e);
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    preventDefaults(e);
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    preventDefaults(e);
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // If religion is changed, deselect any existing religious treatment
    if (name === 'religion') {
        const currentReligiousTreatment = ReligiousTreatments[patientInfo.religion as keyof typeof ReligiousTreatments];
        if (currentReligiousTreatment) {
            setSelectedTreatments(prev => {
                const newSet = new Set(prev);
                newSet.delete(currentReligiousTreatment);
                return newSet;
            });
        }
    }
    setPatientInfo(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTreatmentToggle = (treatment: string) => {
    setSelectedTreatments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(treatment)) {
        newSet.delete(treatment);
      } else {
        newSet.add(treatment);
      }
      return newSet;
    });
  };
  
  const resetForm = () => {
    setPatientInfo({ name: '', age: '', district: '', cell: '', religion: '', language: 'English' });
    setSymptomDescription('');
    setReportComments('');
    setSelectedTreatments(new Set());
    setPrescription(null);
    setError(null);
    setUploadedFiles([]);
    setActiveTab('text');
  };

  const handleEdit = () => {
    setPrescription(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const descriptionForApi = activeTab === 'text' ? symptomDescription : reportComments;
    const isInputMissing =
        (activeTab === 'text' && symptomDescription.trim() === '') ||
        (activeTab === 'upload' && uploadedFiles.length === 0);

    if (!patientInfo.name || !patientInfo.age || !patientInfo.district || !patientInfo.religion || !patientInfo.language || isInputMissing || selectedTreatments.size === 0) {
        setError('Please fill all required fields, describe your symptoms or upload a report, and select at least one treatment type.');
        return;
    }

    setError(null);
    setIsLoading(true);
    setPrescription(null);

    try {
      const fileParts = await Promise.all(uploadedFiles.map(fileToPart));
      const treatments = [...selectedTreatments];
      const result = await generatePrescription(patientInfo, descriptionForApi, treatments, fileParts);
      setPrescription(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const LoadingScreen: React.FC = () => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-50">
        <LoadingIcon className="w-24 h-24 text-teal-500"/>
        <p className="text-white text-xl mt-4 animate-pulse">Consulting with the AI Doctor...</p>
        <p className="text-gray-300 mt-2">Analyzing reports and crafting your health plan.</p>
    </div>
  );
  
  const religiousTreatment = ReligiousTreatments[patientInfo.religion as keyof typeof ReligiousTreatments];

  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-200 font-sans">
      {isLoading && <LoadingScreen />}
      <header className="py-4 bg-transparent no-print">
        <div className="container mx-auto px-4 flex items-center justify-center space-x-3">
          <AIDoctorLogoIcon className="h-10 w-10 text-teal-600 dark:text-teal-400"/>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
            AI Doctor
          </h1>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {!prescription ? (
          <div className="max-w-3xl mx-auto bg-white/80 dark:bg-gray-800/50 rounded-2xl shadow-2xl shadow-gray-300/30 dark:shadow-black/30 p-6 sm:p-8 space-y-8 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Patient Information</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Provide your details for a personalized plan.</p>
            </div>
            
            {error && <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-md" role="alert"><p>{error}</p></div>}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" id="name" required value={patientInfo.name} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 transition-colors"/>
                </div>
                 <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age <span className="text-red-500">*</span></label>
                  <input type="number" name="age" id="age" required value={patientInfo.age} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 transition-colors"/>
                </div>
                 <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">District / City <span className="text-red-500">*</span></label>
                  <input type="text" name="district" id="district" required value={patientInfo.district} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 transition-colors"/>
                </div>
                 <div>
                  <label htmlFor="cell" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cell No. (Optional)</label>
                  <input type="tel" name="cell" id="cell" value={patientInfo.cell} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 transition-colors"/>
                </div>
                <div>
                  <label htmlFor="religion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Religion <span className="text-red-500">*</span></label>
                  <select name="religion" id="religion" required value={patientInfo.religion} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 transition-colors">
                    <option value="" disabled>Select Religion</option>
                    <option value="Islam">Islam</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Hinduism">Hinduism</option>
                    <option value="Buddhism">Buddhism</option>
                    <option value="Sikhism">Sikhism</option>
                    <option value="Judaism">Judaism</option>
                    <option value="Baháʼí Faith">Baháʼí Faith</option>
                    <option value="Chinese Folk Religion">Chinese Folk Religion</option>
                    <option value="Spiritism">Spiritism</option>
                    <option value="Ethnic/Indigenous Religions">Ethnic/Indigenous Religions</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Language <span className="text-red-500">*</span></label>
                  <select name="language" id="language" required value={patientInfo.language} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 transition-colors">
                    {supportedLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Describe Illness or Upload Reports <span className="text-red-500">*</span></label>
                 <div className="border-b border-gray-300 dark:border-gray-600">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button type="button" onClick={() => setActiveTab('text')} className={`${activeTab === 'text' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                            Describe Symptoms
                        </button>
                        <button type="button" onClick={() => setActiveTab('upload')} className={`${activeTab === 'upload' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                            Upload Reports
                        </button>
                    </nav>
                </div>
                
                <div className="mt-4">
                  {activeTab === 'text' && (
                     <div className="relative">
                      <textarea name="symptomDescription" id="symptomDescription" rows={5} value={symptomDescription} onChange={(e) => setSymptomDescription(e.target.value)} placeholder="For example: I have a fever, cough, and headache..." className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 transition-colors"></textarea>
                    </div>
                  )}
                  {activeTab === 'upload' && (
                     <div className="space-y-4">
                        <div
                            onDragEnter={handleDragEnter}
                            onDragOver={preventDefaults}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/50' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50'}`}
                        >
                            <div className="text-center">
                                <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold text-teal-600 dark:text-teal-400">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">PDF, PNG, JPG up to 10MB</p>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/jpeg,image/png,application/pdf" className="hidden" />
                        
                        {uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploaded Files:</h3>
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                        <div className="flex items-center gap-3">
                                           <DocumentIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                                           <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</span>
                                           <span className="text-xs text-gray-500 dark:text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                        <button type="button" onClick={() => removeFile(file.name)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label htmlFor="reportComments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Comments or Questions about Reports (Optional)
                            </label>
                            <textarea
                                name="reportComments"
                                id="reportComments"
                                rows={4}
                                value={reportComments}
                                onChange={(e) => setReportComments(e.target.value)}
                                placeholder="Provide context for your reports, or ask specific questions... e.g., 'Please check my kidney function results in the attached file.'"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 transition-colors"
                            ></textarea>
                        </div>
                     </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose Treatment Type(s) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(TreatmentType).map(type => (
                    <label key={type} className={`flex items-center p-3 border dark:border-gray-600 rounded-lg cursor-pointer transition-all ${selectedTreatments.has(type) ? 'bg-teal-50 dark:bg-teal-900/50 border-teal-500 dark:border-teal-400 ring-2 ring-teal-500' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                      <input type="checkbox" checked={selectedTreatments.has(type)} onChange={() => handleTreatmentToggle(type)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"/>
                      <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">{type}</span>
                    </label>
                  ))}
                  {religiousTreatment && (
                    <label key={religiousTreatment} className={`flex items-center p-3 border dark:border-gray-600 rounded-lg cursor-pointer transition-all ${selectedTreatments.has(religiousTreatment) ? 'bg-teal-50 dark:bg-teal-900/50 border-teal-500 dark:border-teal-400 ring-2 ring-teal-500' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                      <input type="checkbox" checked={selectedTreatments.has(religiousTreatment)} onChange={() => handleTreatmentToggle(religiousTreatment)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"/>
                      <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">{religiousTreatment}</span>
                    </label>
                  )}
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-teal-600 text-white font-semibold rounded-lg shadow-lg shadow-teal-500/20 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-teal-300 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-100">
                {isLoading ? 'Generating...' : 'Get AI Prescription'}
              </button>
            </form>
          </div>
        ) : (
          <Prescription 
            patientInfo={patientInfo}
            illnessTitle={prescription.illnessTitle}
            content={prescription.prescriptionContent} 
            advice={prescription.advice}
            onReset={resetForm}
            onEdit={handleEdit}
          />
        )}
      </main>
    </div>
  );
};

export default App;
