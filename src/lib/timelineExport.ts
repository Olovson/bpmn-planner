import type { GanttTask } from '@/lib/ganttDataConverter';
import * as XLSX from 'xlsx';

/**
 * Export timeline tasks to Excel
 */
export function exportTimelineToExcel(tasks: GanttTask[], filename: string = 'timeline.xlsx') {
  // Prepare data for Excel
  const rows = tasks.map((task) => ({
    'Jira namn': task.jira_name || task.text || 'N/A',
    'Jira typ': task.jira_type || '',
    'BPMN fil': task.bpmnFile || '',
    'Element ID': task.bpmnElementId || '',
    'Start datum': task.start_date,
    'Slut datum': task.end_date,
    'Varaktighet (dagar)': task.duration,
    'Typ': task.type || 'task',
    'Order Index': task.orderIndex ?? '',
    'Branch ID': task.branchId || '',
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Jira namn
    { wch: 12 }, // Jira typ
    { wch: 25 }, // BPMN fil
    { wch: 20 }, // Element ID
    { wch: 12 }, // Start datum
    { wch: 12 }, // Slut datum
    { wch: 15 }, // Varaktighet
    { wch: 10 }, // Typ
    { wch: 12 }, // Order Index
    { wch: 12 }, // Branch ID
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Timeline');

  // Write file
  XLSX.writeFile(wb, filename);
}

