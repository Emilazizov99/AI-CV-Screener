
import React, { useState, useRef, useEffect } from 'react';
import { AppState, ResumeData } from './types';
import { analyzeResume } from './services/geminiService';
import { UploadIcon, BrainIcon, FileIcon, AlertIcon } from './components/Icon';
import Report from './components/Report';
import mammoth from 'mammoth';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isProcessing: false,
    reports: [],
    error: null,
    processingFile: null,
    vacancyName: '',
    jobDescription: '',
    jdFile: null,
    selectedFiles: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const fileList = Array.from(files);
    setState(prev => ({
      ...prev,
      selectedFiles: [...prev.selectedFiles, ...fileList],
      error: null
    }));
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleJDFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setState(prev => ({
      ...prev,
      jdFile: file,
      error: null
    }));
    
    if (jdFileInputRef.current) jdFileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setState(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.filter((_, i) => i !== index)
    }));
  };

  const getMimeType = (file: File): string => {
    if (file.type) return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc': return 'application/msword';
      case 'txt': return 'text/plain';
      case 'rtf': return 'application/rtf';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'application/octet-stream';
    }
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (err) {
      console.error("Mammoth extraction error:", err);
      throw new Error("Could not extract text from Word document. Try converting to PDF.");
    }
  };

  const startAnalysis = async () => {
    if (!state.vacancyName.trim()) {
      setState(prev => ({ ...prev, error: "Vacancy Name is required." }));
      return;
    }
    if (!state.jobDescription.trim() && !state.jdFile) {
      setState(prev => ({ ...prev, error: "Job Description or JD Attachment is required." }));
      return;
    }
    if (state.selectedFiles.length === 0) {
      setState(prev => ({ ...prev, error: "Please add at least one CV attachment." }));
      return;
    }

    const filesToProcess = [...state.selectedFiles];
    // Start processing - keep existing reports if any (support adding more later)
    setState(prev => ({ ...prev, isProcessing: true, error: null, selectedFiles: [] }));
    
    let failureCount = 0;
    
    // Prepare JD data if file exists
    let jdBase64 = '';
    let jdMimeType = '';
    let jdRawText: string | undefined = undefined;

    if (state.jdFile) {
      try {
        const mimeType = getMimeType(state.jdFile);
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
          jdRawText = await extractTextFromWord(state.jdFile);
        } else {
          jdBase64 = await fileToBase64(state.jdFile);
          jdMimeType = mimeType;
        }
      } catch (err) {
        console.error("Failed to read JD file:", err);
      }
    }
    
    // Process files sequentially
    for (const file of filesToProcess) {
      setState(prev => ({ ...prev, processingFile: file.name }));
      
      try {
        const mimeType = getMimeType(file);
        let base64: string | null = null;
        let rawText: string | undefined = undefined;

        // Gemini supports PDF and Images natively. For Word, we extract text.
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
          rawText = await extractTextFromWord(file);
        } else {
          base64 = await fileToBase64(file);
        }

        // Add a small safety delay between requests
        await new Promise(r => setTimeout(r, 2000));
        
        const report = await analyzeResume(
          base64,
          mimeType,
          state.vacancyName,
          state.jobDescription,
          file.name,
          jdBase64,
          jdMimeType,
          rawText,
          jdRawText
        );
        
        // Update reports immediately as they come in
        setState(prev => ({ 
          ...prev, 
          reports: [...prev.reports, report] 
        }));
      } catch (err: any) {
        console.error(`Failed to process ${file.name}:`, err);
        const errorMessage = err?.message || "Unknown error";
        setState(prev => ({ ...prev, error: `Error processing ${file.name}: ${errorMessage}` }));
        failureCount++;
      }
    }

    setState(prev => ({
      ...prev,
      isProcessing: false,
      processingFile: null,
      error: failureCount > 0 
        ? `Analysis complete. ${failureCount} file(s) failed to process.` 
        : null
    }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64String = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const reset = () => {
    setState({
      isProcessing: false,
      reports: [],
      error: null,
      processingFile: null,
      vacancyName: '',
      jobDescription: '',
      jdFile: null,
      selectedFiles: []
    });
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F9FAFB]">
      {/* Real-time Processing Toast */}
      {state.isProcessing && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-10">
          <div className="bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-70 leading-none mb-1">AI Screener Working</p>
              <p className="text-xs font-bold truncate max-w-[200px]">{state.processingFile}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 glass-morphism border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <BrainIcon />
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              AI CV Screening
            </span>
          </div>
          {(state.reports.length > 0 || state.selectedFiles.length > 0) && (
            <div className="flex items-center gap-3">
               {state.reports.length > 0 && !state.isProcessing && (
                 <button 
                  onClick={() => setState(prev => ({ ...prev, reports: [], selectedFiles: [] }))}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors"
                >
                  Clear Results
                </button>
               )}
              <button 
                onClick={reset}
                className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                Reset App
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-12">
        {/* Only show setup if no reports exist AND we aren't currently processing the first one */}
        {state.reports.length === 0 && !state.isProcessing && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className="md:col-span-7 space-y-6">
              <div className="mb-8">
                <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight leading-[1.1]">
                  Azerconnect Group <span className="text-indigo-600">AI CV Screener</span>
                </h1>
                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                  Identify top talent in seconds by matching multiple resumes to your JD.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vacancy Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Senior Cloud Architect"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-semibold text-slate-800"
                    value={state.vacancyName}
                    onChange={(e) => setState(prev => ({ ...prev, vacancyName: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Job Description</label>
                    <div className="flex items-center gap-2">
                      <input type="file" ref={jdFileInputRef} onChange={handleJDFileSelection} className="hidden" />
                      <button 
                        onClick={() => jdFileInputRef.current?.click()}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                      >
                        <UploadIcon /> {state.jdFile ? 'Change JD File' : 'Attach JD File'}
                      </button>
                    </div>
                  </div>
                  
                  {state.jdFile && (
                    <div className="mb-3 flex items-center justify-between bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="text-indigo-500"><FileIcon /></div>
                        <span className="text-xs font-bold text-slate-700 truncate">{state.jdFile.name}</span>
                      </div>
                      <button 
                        onClick={() => setState(prev => ({ ...prev, jdFile: null }))}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <textarea 
                    placeholder={state.jdFile ? "JD file attached. You can still add additional notes here..." : "Paste the job requirements here..."}
                    rows={state.jdFile ? 4 : 10}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none text-slate-600 text-sm leading-relaxed"
                    value={state.jobDescription}
                    onChange={(e) => setState(prev => ({ ...prev, jobDescription: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-5 space-y-6 sticky top-24">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 min-h-[450px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Attachments Section</h3>
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold">{state.selectedFiles.length} Added</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
                  {state.selectedFiles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center py-12 border-2 border-dashed border-slate-50 rounded-2xl">
                      <FileIcon />
                      <p className="text-sm font-semibold mt-4">Queue is empty</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-50">Upload 1 or more files (PDF, Word, Images, etc.)</p>
                    </div>
                  ) : (
                    state.selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="text-indigo-500 bg-white p-2 rounded-xl shadow-sm"><FileIcon /></div>
                          <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                        </div>
                        <button onClick={() => removeFile(idx)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">✕</button>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-4">
                  <input type="file" multiple ref={fileInputRef} onChange={handleFileSelection} className="hidden" />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-bold hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    <UploadIcon /> Add CV Attachments (Any Format)
                  </button>
                  <button 
                    disabled={state.selectedFiles.length === 0}
                    onClick={startAnalysis}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-md font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                  >
                    Run AI Screening
                  </button>
                </div>
              </div>
              {state.error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-3">
                  <AlertIcon /> {state.error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initial Loading State for the first candidate */}
        {state.isProcessing && state.reports.length === 0 && (
          <div className="max-w-xl mx-auto text-center py-32 animate-in fade-in zoom-in-95">
            <div className="relative w-32 h-32 mx-auto mb-10">
              <div className="absolute inset-0 border-[6px] border-indigo-100 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                <BrainIcon />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Analyzing First Batch...</h2>
            <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-bold shadow-lg mb-4">
              <FileIcon /> {state.processingFile}
            </div>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">The dashboard will appear as soon as the first profile is ready.</p>
          </div>
        )}

        {/* Display results progressively */}
        {state.reports.length > 0 && (
          <Report 
            reports={state.reports} 
            vacancyName={state.vacancyName} 
            jobDescription={state.jobDescription} 
            jdFileName={state.jdFile?.name}
          />
        )}
      </main>
    </div>
  );
};

export default App;
