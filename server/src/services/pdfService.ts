import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

export class PDFService {
  static async generateTaskReport(data: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      const html = this.generateTaskReportHTML(data);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }

  static async generateAttendanceReport(data: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      const html = this.generateAttendanceReportHTML(data);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }

  private static generateTaskReportHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Task Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .report-title { font-size: 20px; margin: 10px 0; }
          .report-period { color: #666; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
          .kpi-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
          .kpi-value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .kpi-label { color: #666; font-size: 14px; margin-top: 5px; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background-color: #f9fafb; font-weight: 600; }
          .priority-high { color: #dc2626; font-weight: bold; }
          .priority-medium { color: #d97706; font-weight: bold; }
          .priority-low { color: #059669; font-weight: bold; }
          .status-completed { color: #059669; }
          .status-in-progress { color: #2563eb; }
          .status-not-started { color: #6b7280; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TaskFlow</div>
          <div class="report-title">${data.type === 'weekly' ? 'Weekly' : 'Custom'} Task Report</div>
          <div class="report-period">
            ${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-value">${data.kpis.totalTasks}</div>
            <div class="kpi-label">Total Tasks</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${data.kpis.completedTasks}</div>
            <div class="kpi-label">Completed</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${data.kpis.completionRate}%</div>
            <div class="kpi-label">Completion Rate</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${data.kpis.overdueTasks}</div>
            <div class="kpi-label">Overdue</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Task Details</div>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${data.tasks.map((task: any) => `
                <tr>
                  <td>${task.title}</td>
                  <td class="priority-${task.priority}">${task.priority.toUpperCase()}</td>
                  <td class="status-${task.status.replace('_', '-')}">${task.status.replace('_', ' ').toUpperCase()}</td>
                  <td>${task.assignedTo}</td>
                  <td>${new Date(task.createdAt).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${data.topPerformers && data.topPerformers.length > 0 ? `
        <div class="section">
          <div class="section-title">Top Performers</div>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Tasks Completed</th>
                <th>Hours Worked</th>
              </tr>
            </thead>
            <tbody>
              ${data.topPerformers.map((performer: any) => `
                <tr>
                  <td>${performer.name}</td>
                  <td>${performer.tasksCompleted}</td>
                  <td>${performer.hoursWorked.toFixed(1)}h</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          Generated on ${new Date().toLocaleString()} | TaskFlow Report System
        </div>
      </body>
      </html>
    `;
  }

  private static generateAttendanceReportHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Attendance Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .report-title { font-size: 20px; margin: 10px 0; }
          .report-period { color: #666; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
          .summary-value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .summary-label { color: #666; font-size: 14px; margin-top: 5px; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background-color: #f9fafb; font-weight: 600; }
          .status-present { color: #059669; font-weight: bold; }
          .status-absent { color: #dc2626; font-weight: bold; }
          .status-partial { color: #d97706; font-weight: bold; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TaskFlow</div>
          <div class="report-title">Attendance Report</div>
          <div class="report-period">
            ${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">${data.summary.totalRecords}</div>
            <div class="summary-label">Total Records</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.summary.presentDays}</div>
            <div class="summary-label">Present Days</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${data.summary.rate.toFixed(1)}%</div>
            <div class="summary-label">Attendance Rate</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Attendance Records</div>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.attendance.map((record: any) => `
                <tr>
                  <td>${record.userId?.name || 'Unknown'}</td>
                  <td>${new Date(record.date).toLocaleDateString()}</td>
                  <td>${record.clockIn?.time ? new Date(record.clockIn.time).toLocaleTimeString() : '-'}</td>
                  <td>${record.clockOut?.time ? new Date(record.clockOut.time).toLocaleTimeString() : '-'}</td>
                  <td>${record.clockIn && record.clockOut ? 
                    ((new Date(record.clockOut.time).getTime() - new Date(record.clockIn.time).getTime()) / (1000 * 60 * 60)).toFixed(1) + 'h' : 
                    '-'}</td>
                  <td class="status-${record.clockIn && record.clockOut ? 'present' : record.clockIn ? 'partial' : 'absent'}">
                    ${record.clockIn && record.clockOut ? 'Present' : record.clockIn ? 'Partial' : 'Absent'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          Generated on ${new Date().toLocaleString()} | TaskFlow Report System
        </div>
      </body>
      </html>
    `;
  }
}