import { jsPDF } from 'jspdf';
import type { DiagramData, DiagramType } from '@/types/prd';

export interface PDFExportOptions {
  title: string;
  prdContent: string;
  diagrams: Record<DiagramType, DiagramData[]>;
  includeDiagrams: boolean;
  includeMetadata: boolean;
}

export class PDFExportService {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number;
  private margin: number = 20;
  private lineHeight: number = 7;
  private pageHeight: number = 297;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.currentY = this.margin;
  }

  /**
   * Export PRD and diagrams to PDF
   */
  async exportToPDF(options: PDFExportOptions): Promise<Blob> {
    try {
      // Add title page
      this.addTitlePage(options.title);
      this.addNewPage();

      // Add PRD content
      this.addPRDContent(options.prdContent);
      this.addNewPage();

      // Add diagrams if requested
      if (options.includeDiagrams) {
        await this.addDiagrams(options.diagrams);
      }

      // Add metadata if requested
      if (options.includeMetadata) {
        this.addMetadata(options);
      }

      // Return the PDF as a blob
      return this.doc.output('blob');
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF');
    }
  }

  /**
   * Add title page
   */
  private addTitlePage(title: string): void {
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 20;
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Product Requirements Document', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 20;
    
    this.doc.setFontSize(12);
    this.doc.text(`Generated on: ${new Date().toLocaleDateString()}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 20;
    
    this.doc.setFontSize(10);
    this.doc.text('This document contains the complete PRD along with supporting diagrams and technical specifications.', 
      this.pageWidth / 2, this.currentY, { align: 'center' });
  }

  /**
   * Add PRD content
   */
  private addPRDContent(content: string): void {
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Product Requirements Document', this.margin, this.currentY);
    this.currentY += this.lineHeight;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    // Split content into lines that fit the page width
    const lines = this.splitTextToFit(content, this.pageWidth - 2 * this.margin);
    
    for (const line of lines) {
      if (this.currentY > this.pageHeight - this.margin) {
        this.addNewPage();
      }
      
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  /**
   * Add diagrams section
   */
  private async addDiagrams(diagrams: Record<DiagramType, DiagramData[]>): Promise<void> {
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Diagrams and Technical Specifications', this.margin, this.currentY);
    this.currentY += this.lineHeight * 1.5;

    // Group diagrams by type
    const diagramTypes = Object.keys(diagrams) as DiagramType[];
    
    for (const diagramType of diagramTypes) {
      const typeDiagrams = diagrams[diagramType];
      if (typeDiagrams.length === 0) continue;

      // Add diagram type header
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      const typeLabel = this.getDiagramTypeLabel(diagramType);
      this.doc.text(typeLabel, this.margin, this.currentY);
      this.currentY += this.lineHeight;

      // Add each diagram of this type
      for (const diagram of typeDiagrams) {
        if (this.currentY > this.pageHeight - this.margin - 50) {
          this.addNewPage();
        }

        // Add diagram metadata
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(diagram.name, this.margin, this.currentY);
        this.currentY += this.lineHeight;

        if (diagram.description) {
          this.doc.setFontSize(10);
          this.doc.setFont('helvetica', 'normal');
          this.doc.text(diagram.description, this.margin, this.currentY);
          this.currentY += this.lineHeight;
        }

        // Add diagram creation info
        this.doc.setFontSize(8);
        this.doc.setFont('helvetica', 'italic');
        const createdDate = new Date(diagram.createdAt).toLocaleDateString();
        this.doc.text(`Created: ${createdDate} | Version: ${diagram.version}`, this.margin, this.currentY);
        this.currentY += this.lineHeight;

        // Add diagram code (Mermaid)
        this.doc.setFontSize(8);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text('Mermaid Code:', this.margin, this.currentY);
        this.currentY += this.lineHeight;

        // Split Mermaid code into lines
        const codeLines = this.splitTextToFit(diagram.mermaidCode, this.pageWidth - 2 * this.margin);
        for (const codeLine of codeLines) {
          if (this.currentY > this.pageHeight - this.margin) {
            this.addNewPage();
          }
          this.doc.text(codeLine, this.margin + 5, this.currentY);
          this.currentY += this.lineHeight * 0.8;
        }

        this.currentY += this.lineHeight;
      }

      this.currentY += this.lineHeight;
    }
  }

  /**
   * Add metadata section
   */
  private addMetadata(options: PDFExportOptions): void {
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Document Metadata', this.margin, this.currentY);
    this.currentY += this.lineHeight * 1.5;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    const metadata = [
      ['Export Date', new Date().toLocaleDateString()],
      ['Total Diagrams', this.getTotalDiagramCount(options.diagrams).toString()],
      ['Flowchart Types', this.getDiagramTypeCount(options.diagrams, 'flowchart').toString()],
      ['ER Diagram Types', this.getDiagramTypeCount(options.diagrams, 'er_diagram').toString()],
    ];

    for (const [label, value] of metadata) {
      this.doc.text(`${label}: ${value}`, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  /**
   * Add new page
   */
  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  /**
   * Split text to fit page width
   */
  private splitTextToFit(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = this.doc.getTextWidth(testLine);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Get diagram type label
   */
  private getDiagramTypeLabel(type: DiagramType): string {
    const labels: Record<DiagramType, string> = {
      system_architecture: 'System Architecture',
      user_flow: 'User Flow',
      data_flow: 'Data Flow',
      deployment: 'Deployment',
      database_schema: 'Database Schema',
      data_model: 'Data Model',
      user_data_structure: 'User Data Structure',
      api_schema: 'API Schema'
    };
    return labels[type] || type;
  }

  /**
   * Get total diagram count
   */
  private getTotalDiagramCount(diagrams: Record<DiagramType, DiagramData[]>): number {
    return Object.values(diagrams).reduce((total, typeDiagrams) => total + typeDiagrams.length, 0);
  }

  /**
   * Get diagram count by category
   */
  private getDiagramTypeCount(diagrams: Record<DiagramType, DiagramData[]>, category: 'flowchart' | 'er_diagram'): number {
    const flowchartTypes = ['system_architecture', 'user_flow', 'data_flow', 'deployment'];
    const erTypes = ['database_schema', 'data_model', 'user_data_structure', 'api_schema'];
    
    const typesToCount = category === 'flowchart' ? flowchartTypes : erTypes;
    return typesToCount.reduce((total, type) => {
      return total + (diagrams[type as DiagramType]?.length || 0);
    }, 0);
  }
}

export const pdfExportService = new PDFExportService();
