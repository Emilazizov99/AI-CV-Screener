
import { ResumeData } from "../types";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToExcel = async (reports: ResumeData[], vacancyName: string) => {
  if (!reports || reports.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Candidates_Summary');

  // Summary sheet for all candidates
  const summaryHeader = [
    "Candidate Name", 
    "Match Score (100%)", 
    "Experience (50%)", 
    "Skills (20%)", 
    "Language (15%)", 
    "Education (15%)", 
    "Fit Profile", 
    "Email", 
    "Phone", 
    "Key Reason"
  ];

  summarySheet.addRow(summaryHeader);

  // Style header row
  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' } // Yellow
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  const summaryRows = reports
    .sort((a, b) => b.analysis.score - a.analysis.score)
    .map(r => [
      r.candidateName,
      `${r.analysis.score}%`,
      `${r.analysis.scoringBreakdown?.experienceScore || 0}% (${r.analysis.scoringBreakdown?.experienceJustification || ""})`,
      `${r.analysis.scoringBreakdown?.skillsScore || 0}% (${r.analysis.scoringBreakdown?.skillsJustification || ""})`,
      `${r.analysis.scoringBreakdown?.languageScore || 0}% (${r.analysis.scoringBreakdown?.languageJustification || ""})`,
      `${r.analysis.scoringBreakdown?.educationScore || 0}% (${r.analysis.scoringBreakdown?.educationJustification || ""})`,
      r.analysis.jobFit,
      r.contactInfo.email,
      r.contactInfo.phone,
      r.analysis.matchReason
    ]);

  summaryRows.forEach(rowData => {
    const row = summarySheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
  });

  // Column widths
  summarySheet.columns = [
    { width: 25 }, { width: 20 }, { width: 60 }, { width: 60 }, { width: 60 }, { width: 60 }, { width: 25 }, { width: 30 }, { width: 20 }, { width: 60 }
  ];

  // Detailed sheet for each candidate
  reports.forEach((r) => {
    const sheetName = r.candidateName.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '');
    const detailSheet = workbook.addWorksheet(sheetName);

    const detailData = [
      ["RECRUITMENT REPORT - CANDIDATE DETAIL"],
      ["Vacancy", vacancyName],
      ["Candidate", r.candidateName],
      [],
      ["ANALYSIS"],
      ["Match Score (100%)", `${r.analysis.score}%`],
      ["Experience (50%)", `${r.analysis.scoringBreakdown?.experienceScore || 0}% (${r.analysis.scoringBreakdown?.experienceJustification || ""})`],
      ["Skills (20%)", `${r.analysis.scoringBreakdown?.skillsScore || 0}% (${r.analysis.scoringBreakdown?.skillsJustification || ""})`],
      ["Language (15%)", `${r.analysis.scoringBreakdown?.languageScore || 0}% (${r.analysis.scoringBreakdown?.languageJustification || ""})`],
      ["Education (15%)", `${r.analysis.scoringBreakdown?.educationScore || 0}% (${r.analysis.scoringBreakdown?.educationJustification || ""})`],
      ["Job Fit Profile", r.analysis.jobFit],
      ["AI Verdict", r.analysis.matchReason],
      [],
      ["CONTACT INFO"],
      ["Email", r.contactInfo.email],
      ["Phone", r.contactInfo.phone],
      ["Location", r.contactInfo.location || "N/A"],
      [],
      ["SKILLS"],
      ["Technical", r.skills.technical.join(", ")],
      ["Soft Skills", r.skills.soft.join(", ")],
      ["Languages", r.skills.languages.join(", ")],
      [],
      ["STRENGTHS"],
      ...r.analysis.strengths.map(s => ["• " + s]),
      [],
      ["SUGGESTIONS"],
      ...r.analysis.suggestions.map(s => ["• " + s])
    ];

    detailData.forEach((rowData, idx) => {
      const row = detailSheet.addRow(rowData);
      
      // Style headers in detail sheet
      if (idx === 0 || (rowData.length === 1 && rowData[0] && !rowData[0].toString().startsWith('•'))) {
        row.font = { bold: true };
        if (idx === 0) {
            row.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' }
            };
        }
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    detailSheet.getColumn(1).width = 30;
    detailSheet.getColumn(2).width = 80;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Recruitment_Report_${vacancyName.replace(/\s+/g, '_')}.xlsx`);
};
