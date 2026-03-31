
import React, { useState, useEffect } from 'react';
import { ResumeData } from '../types';
import { DownloadIcon, CheckIcon, AlertIcon, BrainIcon, FileIcon } from './Icon';
import { exportToExcel } from '../services/excelService';

interface ReportProps {
  reports: ResumeData[];
  vacancyName: string;
  jobDescription: string;
  jdFileName?: string;
}

const Report: React.FC<ReportProps> = ({ reports, vacancyName, jobDescription, jdFileName }) => {
  const [selectedCandidate, setSelectedCandidate] = useState<ResumeData>(reports[0]);
  const [showJD, setShowJD] = useState(false);

  // When reports grow, if we don't have a selection, or to show the user "new" candidates,
  // we update the selection. (Optional: Only update if nothing is selected yet)
  useEffect(() => {
    if (reports.length > 0 && !selectedCandidate) {
      setSelectedCandidate(reports[0]);
    }
  }, [reports]);

  if (!selectedCandidate && reports.length === 0) return null;
  
  // Safe fallback if selected candidate was somehow lost
  const activeCandidate = selectedCandidate || reports[0];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (score >= 60) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-rose-600 border-rose-200 bg-rose-50';
  };

  const sortedReports = [...reports].sort((a, b) => (b.analysis?.score || 0) - (a.analysis?.score || 0));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-6 mb-8 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">Target Vacancy</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{vacancyName || "Role Analysis"}</h2>
            <div className="mt-3 flex items-center gap-4">
              <button 
                onClick={() => setShowJD(!showJD)}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
              >
                {showJD ? 'Hide Job Description' : 'View Job Description'}
                <svg className={`w-4 h-4 transition-transform ${showJD ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <span className="text-slate-300">|</span>
              <p className="text-slate-500 text-sm">
                Screened <span className="font-bold text-slate-700">{reports.length}</span> candidates so far
              </p>
            </div>
          </div>
          <button
            onClick={() => exportToExcel(reports, vacancyName)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95 whitespace-nowrap"
          >
            <DownloadIcon />
            Download Excel Report ({reports.length})
          </button>
        </div>

        {showJD && (
          <div className="mt-6 pt-6 border-t border-slate-50 animate-in slide-in-from-top-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Original Job Description</h4>
            {jdFileName && (
              <div className="mb-3 flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100 w-fit">
                <div className="text-indigo-500"><FileIcon /></div>
                <span className="text-xs font-bold text-slate-700">{jdFileName}</span>
              </div>
            )}
            <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {jobDescription || (jdFileName ? "See attached JD file." : "No description provided.")}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileIcon /> Candidate Ranking
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {sortedReports.map((r, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedCandidate(r)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                    activeCandidate?.candidateName === r.candidateName 
                    ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100' 
                    : 'bg-white border-white hover:border-indigo-100 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold truncate mr-2 ${activeCandidate?.candidateName === r.candidateName ? 'text-white' : 'text-slate-800'}`}>
                      {r.candidateName}
                    </span>
                    <span className={`text-xs font-black px-2 py-1 rounded-lg shrink-0 ${
                      activeCandidate?.candidateName === r.candidateName 
                      ? 'bg-white/20 text-white' 
                      : getScoreColor(r.analysis?.score || 0)
                    }`}>
                      {r.analysis?.score || 0}%
                    </span>
                  </div>
                  <p className={`text-[10px] uppercase font-bold tracking-tight truncate ${activeCandidate?.candidateName === r.candidateName ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {r.analysis?.jobFit || "Unclassified"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-slate-100 space-y-10 relative overflow-hidden min-h-[600px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-16 -mt-16"></div>

            <div className="relative flex flex-col md:flex-row justify-between items-start gap-6 pb-8 border-b border-slate-50">
               <div className="max-w-[70%]">
                  <h3 className="text-3xl font-black text-slate-900 mb-2 truncate">{activeCandidate?.candidateName}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-2">
                      <span className="opacity-40">Email:</span> {activeCandidate?.contactInfo?.email || "N/A"}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="opacity-40">Phone:</span> {activeCandidate?.contactInfo?.phone || "N/A"}
                    </span>
                  </div>
               </div>
                <div className={`px-8 py-4 rounded-3xl border-2 text-center transition-all ${getScoreColor(activeCandidate?.analysis?.score || 0)} shadow-sm`}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Match Score (100%)</p>
                  <div className="text-4xl font-black">{activeCandidate?.analysis?.score || 0}%</div>
                </div>
            </div>

            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Verdict & Fit Analysis</h4>
              <div className="bg-indigo-50/40 p-6 rounded-3xl border border-indigo-100/50 mb-6">
                <p className="text-slate-800 font-medium leading-relaxed">
                  {activeCandidate?.analysis?.matchReason || "No analysis details provided by AI."}
                </p>
              </div>

              {activeCandidate?.analysis?.scoringBreakdown && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience (50%)</p>
                      <div className="text-xl font-black text-indigo-600">{activeCandidate.analysis.scoringBreakdown.experienceScore}%<span className="text-xs text-slate-300 ml-0.5">/50%</span></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      {activeCandidate.analysis.scoringBreakdown.experienceJustification}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skills (20%)</p>
                      <div className="text-xl font-black text-indigo-600">{activeCandidate.analysis.scoringBreakdown.skillsScore}%<span className="text-xs text-slate-300 ml-0.5">/20%</span></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      {activeCandidate.analysis.scoringBreakdown.skillsJustification}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Language (15%)</p>
                      <div className="text-xl font-black text-indigo-600">{activeCandidate.analysis.scoringBreakdown.languageScore}%<span className="text-xs text-slate-300 ml-0.5">/15%</span></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      {activeCandidate.analysis.scoringBreakdown.languageJustification}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Education (15%)</p>
                      <div className="text-xl font-black text-indigo-600">{activeCandidate.analysis.scoringBreakdown.educationScore}%<span className="text-xs text-slate-300 ml-0.5">/15%</span></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      {activeCandidate.analysis.scoringBreakdown.educationJustification}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-emerald-50/20 p-6 rounded-3xl border border-emerald-100/50">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CheckIcon /> Core Strengths
                </h4>
                <ul className="space-y-3">
                  {(activeCandidate?.analysis?.strengths || []).map((s, i) => (
                    <li key={i} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                       <span className="text-emerald-400 font-bold">•</span> {s}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-rose-50/20 p-6 rounded-3xl border border-rose-100/50">
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertIcon /> Development Areas
                </h4>
                <ul className="space-y-3">
                  {(activeCandidate?.analysis?.suggestions || []).map((s, i) => (
                    <li key={i} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                       <span className="text-rose-400 font-bold">•</span> {s}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Experience Highlights</h4>
              <div className="space-y-8 relative pl-4 border-l border-slate-100">
                {(activeCandidate?.experience || []).map((exp, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-500 shadow-sm"></div>
                    <div className="mb-1 flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-900 text-lg leading-none mb-1">{exp.role}</h5>
                        <p className="text-indigo-600 font-bold text-sm">{exp.company}</p>
                      </div>
                      <span className="text-[10px] bg-white px-2 py-1 rounded-full border border-slate-200 text-slate-400 font-bold uppercase shrink-0">{exp.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
