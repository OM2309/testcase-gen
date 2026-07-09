import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { TestRun } from '../types'

/**
 * Format milliseconds to a human-readable duration (e.g., 1m 24s or 4.5s)
 */
function formatDuration(ms?: number | null): string {
  if (!ms) return '0s'
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSecs = Math.round(seconds % 60)
  return `${minutes}m ${remainingSecs}s`
}

/**
 * Generates and downloads a beautifully styled PDF report for a given TestRun.
 */
export function downloadPdfReport(run: TestRun) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // --- COLORS (Modern Dark/Light Slate Theme) ---
  const PRIMARY_COLOR: [number, number, number] = [15, 23, 42] // Deep Slate #0f172a
  const ACCENT_COLOR: [number, number, number] = [99, 102, 241] // Indigo #6366f1
  const SUCCESS_COLOR: [number, number, number] = [16, 185, 129] // Emerald #10b981
  const FAILURE_COLOR: [number, number, number] = [239, 68, 68] // Rose #ef4444
  const TEXT_DARK: [number, number, number] = [30, 41, 59] // Slate 800
  const TEXT_MUTED: [number, number, number] = [100, 116, 139] // Slate 500
  const BG_LIGHT: [number, number, number] = [248, 250, 252] // Slate 50

  // Helper for text alignment & color
  const setDarkText = () => doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2])
  const setMutedText = () => doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2])

  // --- TOP ACCENT BAR ---
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
  doc.rect(0, 0, pageWidth, 15, 'F')

  // --- TITLE & HEADER ---
  let yPos = 28

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
  doc.text('Test Execution Report', 15, yPos)

  // Status Badge right-aligned
  const statusStr = (run.status || 'unknown').toUpperCase()
  doc.setFontSize(10)
  doc.setFont('Helvetica', 'bold')
  let badgeColor = PRIMARY_COLOR
  if (run.status === 'completed') badgeColor = SUCCESS_COLOR
  else if (run.status === 'failed') badgeColor = FAILURE_COLOR

  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2])
  // Calculate text width to size the badge appropriately
  const badgeTextWidth = doc.getTextWidth(statusStr)
  const badgeX = pageWidth - 15 - badgeTextWidth - 6
  doc.rect(badgeX, yPos - 5, badgeTextWidth + 6, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(statusStr, badgeX + 3, yPos)

  yPos += 8

  // Project details
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(11)
  setMutedText()
  doc.text(`Project: `, 15, yPos)
  doc.setFont('Helvetica', 'bold')
  setDarkText()
  doc.text(run.projectName || 'Default Project', 32, yPos)

  doc.setFont('Helvetica', 'normal')
  setMutedText()
  doc.text(`Suite: `, 105, yPos)
  doc.setFont('Helvetica', 'bold')
  setDarkText()
  doc.text(run.suiteName || 'Automated Suite', 118, yPos)

  yPos += 6

  // More metadata
  const startedAtStr = run.startedAt
    ? new Date(run.startedAt).toLocaleString()
    : new Date(run.createdAt).toLocaleString()

  doc.setFont('Helvetica', 'normal')
  setMutedText()
  doc.text(`Date/Time: `, 15, yPos)
  setDarkText()
  doc.text(startedAtStr, 38, yPos)

  setMutedText()
  doc.text(`Target URL: `, 105, yPos)
  setDarkText()
  const targetUrl = run.runConfig?.baseUrl || '—'
  const truncatedUrl = targetUrl.length > 35 ? targetUrl.substring(0, 32) + '...' : targetUrl
  doc.text(truncatedUrl, 128, yPos)

  yPos += 10

  // --- STATS CARDS BLOCK (light gray background panel) ---
  const panelHeight = 22
  doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2])
  doc.setDrawColor(226, 232, 240) // border color
  doc.roundedRect(15, yPos, pageWidth - 30, panelHeight, 3, 3, 'FD')

  // Draw 5 columns inside the stats card: Total, Passed, Failed, Skipped, Success Rate
  const stats = [
    { label: 'TOTAL CASES', val: run.totalTests, color: PRIMARY_COLOR },
    { label: 'PASSED', val: run.passedTests, color: SUCCESS_COLOR },
    { label: 'FAILED', val: run.failedTests, color: FAILURE_COLOR },
    { label: 'SKIPPED', val: run.skippedTests, color: TEXT_MUTED },
    {
      label: 'SUCCESS RATE',
      val: run.totalTests > 0 ? `${((run.passedTests / run.totalTests) * 100).toFixed(0)}%` : '0%',
      color: ACCENT_COLOR
    }
  ]

  const colWidth = (pageWidth - 30) / 5
  stats.forEach((stat, idx) => {
    const colX = 15 + idx * colWidth
    // Draw label
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    setMutedText()
    doc.text(stat.label, colX + colWidth / 2, yPos + 6, { align: 'center' })

    // Draw value
    doc.setFontSize(14)
    doc.setTextColor(stat.color[0], stat.color[1], stat.color[2])
    doc.text(String(stat.val), colX + colWidth / 2, yPos + 15, { align: 'center' })

    // Divider line between columns (except last)
    if (idx < 4) {
      doc.setDrawColor(226, 232, 240)
      doc.line(colX + colWidth, yPos + 4, colX + colWidth, yPos + 18)
    }
  })

  yPos += panelHeight + 10

  // --- TEST CASES HEADER ---
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
  doc.text('Detailed Results', 15, yPos)
  yPos += 5

  // --- DETAILED TEST CASES TABLE ---
  const tableHeaders = [['ID', 'Test Case Title', 'Module', 'Status', 'Duration']]
  
  const tableRows = run.testCaseResults.map(tc => {
    const duration = formatDuration(tc.durationMs)
    let statusText = tc.status.toUpperCase()
    
    // Add warning/error note to failed ones in subsequent steps
    return [
      tc.testCaseId,
      tc.title,
      tc.module || 'General',
      statusText,
      duration
    ]
  })

  // Format table cell colors depending on status
  autoTable(doc, {
    startY: yPos,
    head: tableHeaders,
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // Primary dark slate
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 85 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25, fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'right' }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: 'Helvetica'
    },
    didParseCell: (data) => {
      // Color coding the status column cells
      if (data.section === 'body' && data.column.index === 3) {
        const text = String(data.cell.raw).toLowerCase()
        if (text === 'passed') {
          data.cell.styles.textColor = SUCCESS_COLOR
        } else if (text === 'failed') {
          data.cell.styles.textColor = FAILURE_COLOR
        } else {
          data.cell.styles.textColor = TEXT_MUTED
        }
      }
    },
    margin: { left: 15, right: 15 },
    // If a test failed, render details in a separate sub-row or panel
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = doc.internal.pages.length - 1
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2])
      
      const footerText = `Page ${data.pageNumber}`
      doc.text(footerText, pageWidth - 15 - doc.getTextWidth(footerText), pageHeight - 10)
      doc.text('Test Case Generator — Execution Report', 15, pageHeight - 10)
    }
  })

  // Let's add a list of failed test details below the main table if there are failures
  const failedCases = run.testCaseResults.filter(tc => tc.status === 'failed')
  if (failedCases.length > 0) {
    // Check if we need to add a new page
    // get the last table's ending Y coordinate
    let currentY = (doc as any).lastAutoTable.finalY + 12

    if (currentY > pageHeight - 40) {
      doc.addPage()
      currentY = 25
    }

    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(FAILURE_COLOR[0], FAILURE_COLOR[1], FAILURE_COLOR[2])
    doc.text('Failure Summaries & Error Logs', 15, currentY)
    currentY += 6

    failedCases.forEach((tc, idx) => {
      // Make sure we have space for the block
      if (currentY > pageHeight - 35) {
        doc.addPage()
        currentY = 25
      }

      // Border and background for error details
      doc.setFillColor(254, 242, 242) // Light red bg #fef2f2
      doc.setDrawColor(254, 226, 226) // Light red border #fee2e2
      
      const errorMsg = tc.errorMessage || 'No assertion details provided.'
      const stepStr = tc.failedStepNumber ? `Failed at Step ${tc.failedStepNumber}: ` : ''
      const fullErrorText = `${stepStr}${errorMsg}`
      
      // Calculate text wrapping
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8.5)
      const splitErrorLines = doc.splitTextToSize(fullErrorText, pageWidth - 40)
      const blockHeight = 10 + splitErrorLines.length * 4

      doc.roundedRect(15, currentY, pageWidth - 30, blockHeight, 2, 2, 'FD')

      // Write title of test case
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2])
      doc.text(`${tc.testCaseId} — ${tc.title}`, 20, currentY + 6)

      // Write error message
      doc.setFont('Courier', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(FAILURE_COLOR[0], FAILURE_COLOR[1], FAILURE_COLOR[2])
      doc.text(splitErrorLines, 20, currentY + 12)

      currentY += blockHeight + 5
    })
  }

  // --- DOWNLOAD PDF FILE ---
  const safeFilename = `${run.projectName || 'Project'}_Execution_${run.suiteName || 'Suite'}_${run._id.substring(0, 6)}.pdf`
    .replace(/[^a-z0-9_-]/gi, '_')
  doc.save(safeFilename)
}
