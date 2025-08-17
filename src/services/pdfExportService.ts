import { jsPDF } from 'jspdf';
import type { DiagramData, DiagramType } from '@/types/prd';
import { diagramService } from './diagramService';
import { diagramRendererService, type RenderedDiagram } from './diagramRendererService';

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
  private margin: number = 20; // Standard margins
  private lineHeight: number = 5; // Reduced line height for better spacing
  private pageHeight: number = 297;
  private contentWidth: number;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.contentWidth = this.pageWidth - (2 * this.margin);
    this.currentY = this.margin;
  }

  /**
   * Check if any diagrams exist in the provided diagrams object
   */
  hasDiagrams(diagrams: Record<DiagramType, DiagramData[]>): boolean {
    return Object.values(diagrams).some(diagramArray => diagramArray && diagramArray.length > 0);
  }

  /**
   * Reset the PDF document for a fresh export
   */
  private resetDocument(): void {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.contentWidth = this.pageWidth - (2 * this.margin);
    this.currentY = this.margin;
  }

  /**
   * Export PRD and diagrams to PDF
   */
  async exportToPDF(options: PDFExportOptions): Promise<Blob> {
    try {
      // Reset document for fresh export
      this.resetDocument();

      // Start directly with PRD content (no title page)
      await this.addPRDContent(options.prdContent);

      // Check if diagrams exist and add them if requested
      const diagramsExist = this.hasDiagrams(options.diagrams);
      if (options.includeDiagrams && diagramsExist) {
        this.addNewPage();
        await this.addDiagrams(options.diagrams);
      }

      // Add minimal metadata if requested
      if (options.includeMetadata) {
        this.addNewPage();
        this.addMinimalMetadata(options);
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
    // Background color for title page
    this.doc.setFillColor(240, 248, 255);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F');
    
    // Title
    this.doc.setFontSize(32);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(30, 58, 138);
    this.doc.text(title, this.pageWidth / 2, this.currentY + 50, { align: 'center' });
    
    this.currentY += 60;
    
    // Subtitle
    this.doc.setFontSize(20);
    this.doc.setTextColor(51, 65, 85);
    this.doc.text('Product Requirements Document', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 40;
    
    // Date
    this.doc.setFontSize(16);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 30;
    
    // Description
    this.doc.setFontSize(14);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('This document contains the complete PRD along with supporting diagrams and technical specifications.', 
      this.pageWidth / 2, this.currentY, { align: 'center' });
    
    // Add decorative elements
    this.addDecorativeElements();
  }

  /**
   * Add decorative elements to title page
   */
  private addDecorativeElements(): void {
    // Add some decorative lines
    this.doc.setDrawColor(59, 130, 246);
    this.doc.setLineWidth(0.5);
    
    // Top line
    this.doc.line(this.margin + 20, this.currentY + 20, this.pageWidth - this.margin - 20, this.currentY + 20);
    
    // Bottom line
    this.doc.line(this.margin + 20, this.pageHeight - 40, this.pageWidth - this.margin - 20, this.pageHeight - 40);
  }

  /**
   * Add PRD content with proper markdown-like formatting
   */
  private async addPRDContent(content: string): Promise<void> {
    // Section header
    this.addSectionHeader('Product Requirements Document');
    
    // Process content with proper markdown parsing
    const sections = this.parsePRDContent(content);
    
    for (const section of sections) {
      if (this.currentY > this.pageHeight - this.margin - 40) {
        this.addNewPage();
      }
      
      // Section title
      if (section.title) {
        this.doc.setFontSize(16);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(30, 58, 138);
        this.doc.text(section.title, this.margin, this.currentY);
        this.currentY += this.lineHeight * 2;
      }
      
      // Section content with proper formatting
      if (section.content) {
        await this.addFormattedContent(section.content);
        this.currentY += this.lineHeight * 1; // Reduced spacing between sections
      }
    }
  }

  /**
   * Add formatted content with proper markdown rendering
   */
  private async addFormattedContent(content: string): Promise<void> {
    const lines = content.split('\n');
    let inList = false;

    for (const line of lines) {
      if (this.currentY > this.pageHeight - this.margin - 20) {
        this.addNewPage();
      }

      const trimmedLine = line.trim();
      if (!trimmedLine) {
        // Add spacing for empty lines, but less if we're ending a list
        this.currentY += inList ? this.lineHeight * 0.3 : this.lineHeight * 0.6;
        inList = false;
        continue;
      }

      // Handle different content types
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Bullet list item
        if (!inList) {
          this.currentY += this.lineHeight * 0.3; // Add space before first list item
          inList = true;
        }

        // Add bullet point
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(51, 65, 85);
        this.doc.text('•', this.margin + 5, this.currentY);

        // Process the list text for markdown formatting
        const listText = trimmedLine.substring(2);
        const originalMargin = this.margin;
        this.margin = this.margin + 12; // Indent for list content

        await this.addParagraphWithInlineMarkdown(listText);

        // Restore original margin
        this.margin = originalMargin;
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        // Numbered list item
        if (!inList) {
          this.currentY += this.lineHeight * 0.3; // Add space before first list item
          inList = true;
        }

        // Extract number and text
        const match = trimmedLine.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          const number = match[1];
          const listText = match[2];

          // Add number
          this.doc.setFontSize(11);
          this.doc.setFont('helvetica', 'normal');
          this.doc.setTextColor(51, 65, 85);
          this.doc.text(`${number}.`, this.margin + 5, this.currentY);

          // Process the list text for markdown formatting
          const originalY = this.currentY;
          const originalMargin = this.margin;
          this.margin = this.margin + 20; // Indent for list content

          await this.addParagraphWithInlineMarkdown(listText);

          // Restore original margin
          this.margin = originalMargin;
        }
      } else if (trimmedLine.startsWith('###')) {
        // Sub-sub-section header
        inList = false;
        this.currentY += this.lineHeight * 0.5; // Add space before header
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(71, 85, 105);
        const headerText = trimmedLine.substring(4).trim();
        const headerLines = this.splitTextToFit(headerText, this.contentWidth);

        for (const headerLine of headerLines) {
          this.doc.text(headerLine, this.margin, this.currentY);
          this.currentY += this.lineHeight;
        }
        this.currentY += this.lineHeight * 0.3; // Add space after header
      } else if (trimmedLine.startsWith('##')) {
        // Sub-section header
        inList = false;
        this.currentY += this.lineHeight * 0.8; // Add space before header
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(51, 65, 85);
        const headerText = trimmedLine.substring(3).trim();
        const headerLines = this.splitTextToFit(headerText, this.contentWidth);

        for (const headerLine of headerLines) {
          this.doc.text(headerLine, this.margin, this.currentY);
          this.currentY += this.lineHeight;
        }
        this.currentY += this.lineHeight * 0.5; // Add space after header
      } else if (trimmedLine.startsWith('#')) {
        // Main section header
        inList = false;
        this.currentY += this.lineHeight * 1.0; // Add space before header
        this.doc.setFontSize(16);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(30, 58, 138);
        const headerText = trimmedLine.substring(1).trim();
        const headerLines = this.splitTextToFit(headerText, this.contentWidth);

        for (const headerLine of headerLines) {
          this.doc.text(headerLine, this.margin, this.currentY);
          this.currentY += this.lineHeight;
        }
        this.currentY += this.lineHeight * 1.2; // Reduced space after header
      } else {
        // Regular paragraph text - handle inline markdown
        if (inList) {
          inList = false;
          this.currentY += this.lineHeight * 0.5; // Reduced space after list
        }

        // Process inline markdown in the text
        await this.addParagraphWithInlineMarkdown(trimmedLine);
        this.currentY += this.lineHeight * 0.8; // Standard space after paragraph
      }
    }
  }

  /**
   * Parse PRD content into sections with better markdown handling
   */
  private parsePRDContent(content: string): Array<{ title?: string; content: string }> {
    const sections: Array<{ title?: string; content: string }> = [];
    const lines = content.split('\n');

    let currentSection = { content: '' };
    let isFirstSection = true;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if line is a main header (starts with single #)
      if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('## ')) {
        // Save previous section if it has content
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }

        // Start new section
        const title = trimmedLine.replace(/^#\s*/, '');
        currentSection = { title, content: '' };
        isFirstSection = false;
      } else {
        // Add line to current section content
        currentSection.content += line + '\n';
      }
    }

    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    // If no sections were created (no # headers), treat entire content as one section
    if (sections.length === 0 && content.trim()) {
      sections.push({ content: content });
    }

    return sections;
  }

  /**
   * Add paragraph with inline markdown formatting
   */
  private async addParagraphWithInlineMarkdown(text: string): Promise<void> {
    this.doc.setFontSize(11);
    this.doc.setTextColor(51, 65, 85);

    // Process bold text with simple string replacement approach
    let processedText = text;
    const segments: Array<{text: string, bold: boolean}> = [];

    // Use a simpler approach: split by ** and alternate between normal and bold
    const parts = text.split('**');

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) { // Skip empty parts
        const isBold = i % 2 === 1; // Odd indices are bold (between ** pairs)
        segments.push({text: parts[i], bold: isBold});
      }
    }

    // Render segments with proper line wrapping
    let currentLine = '';
    let currentSegments: Array<{text: string, bold: boolean}> = [];

    for (const segment of segments) {
      const words = segment.text.split(/(\s+)/); // Keep spaces

      for (const word of words) {
        if (!word) continue;

        const testLine = currentLine + word;

        // Check if line would be too long
        this.doc.setFont('helvetica', segment.bold ? 'bold' : 'normal');
        const testWidth = this.doc.getTextWidth(testLine);

        if (testWidth > this.contentWidth && currentLine.length > 0) {
          // Render current line and start new one
          this.renderLineSegments(currentSegments, this.margin, this.currentY);
          this.currentY += this.lineHeight;

          currentLine = word;
          currentSegments = [{text: word, bold: segment.bold}];
        } else {
          // Add to current line
          currentLine = testLine;

          // Merge with previous segment if same formatting
          if (currentSegments.length > 0 &&
              currentSegments[currentSegments.length - 1].bold === segment.bold) {
            currentSegments[currentSegments.length - 1].text += word;
          } else {
            currentSegments.push({text: word, bold: segment.bold});
          }
        }
      }
    }

    // Render final line
    if (currentLine.trim()) {
      this.renderLineSegments(currentSegments, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  /**
   * Render line segments with mixed formatting
   */
  private renderLineSegments(segments: Array<{text: string, bold: boolean}>, startX: number, y: number): void {
    let currentX = startX;

    for (const segment of segments) {
      this.doc.setFont('helvetica', segment.bold ? 'bold' : 'normal');
      this.doc.text(segment.text, currentX, y);
      currentX += this.doc.getTextWidth(segment.text);
    }
  }

  /**
   * Clean diagram name by removing date suffixes
   */
  private cleanDiagramName(name: string): string {
    // Remove common date patterns from the end of diagram names
    // Patterns like "System Architecture 1/15/2025" or "User Flow 15/01/2025"
    return name
      .replace(/\s+\d{1,2}\/\d{1,2}\/\d{4}$/, '') // MM/DD/YYYY or M/D/YYYY
      .replace(/\s+\d{1,2}-\d{1,2}-\d{4}$/, '') // MM-DD-YYYY or M-D-YYYY
      .replace(/\s+\d{4}-\d{1,2}-\d{1,2}$/, '') // YYYY-MM-DD or YYYY-M-D
      .replace(/\s+\d{1,2}\.\d{1,2}\.\d{4}$/, '') // DD.MM.YYYY or D.M.YYYY
      .trim();
  }

  /**
   * Add diagrams section - first flowcharts, then ER diagrams
   */
  private async addDiagrams(diagrams: Record<DiagramType, DiagramData[]>): Promise<void> {
    // Section header
    this.addSectionHeader('Diagrams and Technical Specifications');
    
    // First, add all flowcharts
    const flowchartTypes: DiagramType[] = ['system_architecture', 'user_flow', 'data_flow', 'deployment'];
    await this.addDiagramCategory('Flowcharts', flowchartTypes, diagrams);
    
    // Then, add all ER diagrams
    const erDiagramTypes: DiagramType[] = ['database_schema', 'data_model', 'user_data_structure', 'api_schema'];
    await this.addDiagramCategory('Entity-Relationship Diagrams', erDiagramTypes, diagrams);
  }

  /**
   * Add a category of diagrams
   */
  private async addDiagramCategory(
    categoryName: string, 
    diagramTypes: DiagramType[], 
    diagrams: Record<DiagramType, DiagramData[]>
  ): Promise<void> {
    // Check if we have any diagrams in this category
    const hasDiagrams = diagramTypes.some(type => diagrams[type]?.length > 0);
    if (!hasDiagrams) return;
    
    // Category header
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(30, 58, 138);
    this.doc.text(categoryName, this.margin, this.currentY);
    this.currentY += this.lineHeight * 1.5;
    
    // Add each diagram type
    for (const diagramType of diagramTypes) {
      const typeDiagrams = diagrams[diagramType];
      if (!typeDiagrams || typeDiagrams.length === 0) continue;

      // Add each diagram of this type
      for (const diagram of typeDiagrams) {
        // Start each diagram on a new page
        this.addNewPage();

        // Clean diagram name (remove date if present)
        const cleanName = this.cleanDiagramName(diagram.name || 'Untitled Diagram');

        // Add diagram title
        this.doc.setFontSize(16);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(51, 65, 85);
        this.doc.text(cleanName, this.margin, this.currentY);
        this.currentY += this.lineHeight * 2;

        // Add rendered diagram image
        await this.addRenderedDiagramImage(diagram);

        this.currentY += this.lineHeight * 2;
      }
      
      this.currentY += this.lineHeight * 0.5;
    }
  }

  /**
   * Add a rendered diagram image to the PDF
   */
  private async addRenderedDiagramImage(diagram: DiagramData): Promise<void> {
    try {
      // Render the diagram
      const renderedDiagram = await diagramRendererService.renderDiagram(diagram);
      
      if (renderedDiagram) {
        // Get dimensions for PDF layout
        const { width, height, scale } = diagramRendererService.getDiagramDimensions(renderedDiagram);
        
        // Center the diagram on the page
        const imageX = this.margin + (this.contentWidth - width) / 2;
        const imageY = this.currentY;
        
        // Add a border around the diagram
        this.doc.setDrawColor(226, 232, 240);
        this.doc.setLineWidth(0.5);
        this.doc.rect(imageX - 2, imageY - 2, width + 4, height + 4, 'S');
        
        // Convert SVG to data URL and add to PDF
        const dataURL = await diagramRendererService.convertSVGToDataURL(renderedDiagram.svgElement);
        
        if (dataURL) {
          try {
            // Add the image to the PDF
            this.doc.addImage(dataURL, 'PNG', imageX, imageY, width, height);
            this.currentY += height + 10; // Reduced space after diagram
          } catch (imageError) {
            console.warn('Failed to add diagram image, falling back to code:', imageError);
            // Fallback to code if image fails
            this.addDiagramCodeFallback(diagram);
          }
        } else {
          // Fallback to code if conversion fails
          this.addDiagramCodeFallback(diagram);
        }
      } else {
        // Fallback to code if rendering fails
        this.addDiagramCodeFallback(diagram);
      }
      
    } catch (error) {
      console.error('Failed to add rendered diagram image:', error);
      // Fallback to code
      this.addDiagramCodeFallback(diagram);
    }
  }

  /**
   * Fallback method to add diagram code when image rendering fails
   */
  private addDiagramCodeFallback(diagram: DiagramData): void {
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Diagram Code (rendering failed):', this.margin, this.currentY);
    this.currentY += this.lineHeight;
    
    // Add code in a formatted box
    this.doc.setFillColor(248, 250, 252);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.5);
    
    const codeBoxHeight = Math.min(50, Math.max(25, (diagram.mermaidCode.split('\n').length * 4)));
    this.doc.rect(this.margin, this.currentY, this.contentWidth, codeBoxHeight, 'FD');
    
    // Add code text
    this.doc.setFontSize(8);
    this.doc.setFont('courier', 'normal');
    this.doc.setTextColor(51, 65, 85);
    
    const codeLines = diagram.mermaidCode.split('\n').slice(0, 12); // Limit to first 12 lines
    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i];
      if (this.currentY + 4 > this.pageHeight - this.margin) {
        this.addNewPage();
      }
      this.doc.text(line.substring(0, 100), this.margin + 3, this.currentY + 4);
      this.currentY += 4;
    }
    
    if (diagram.mermaidCode.split('\n').length > 12) {
      this.doc.setTextColor(156, 163, 175);
      this.doc.text('... (truncated)', this.margin + 3, this.currentY + 4);
      this.currentY += 4;
    }
    
    this.currentY += this.lineHeight;
  }

  /**
   * Add section header with styling and proper text wrapping
   */
  private addSectionHeader(title: string): void {
    // Add page break if needed
    if (this.currentY > this.pageHeight - this.margin - 50) {
      this.addNewPage();
    }

    // Split title into lines that fit within the content width
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    const titleLines = this.splitTextToFit(title, this.contentWidth - 10);

    // Calculate header height based on number of lines with more padding
    const headerHeight = Math.max(35, titleLines.length * 14 + 20);

    // Section header with background
    this.doc.setFillColor(30, 58, 138);
    this.doc.rect(this.margin - 5, this.currentY - 5, this.contentWidth + 10, headerHeight, 'F');

    // Header text with proper line spacing and centering
    this.doc.setTextColor(255, 255, 255);
    let textY = this.currentY + 12; // More top padding

    for (const line of titleLines) {
      this.doc.text(line, this.margin + 2, textY); // Small left padding
      textY += 14; // Increased line spacing
    }

    this.currentY += headerHeight + 8;
  }

  /**
   * Add minimal metadata section
   */
  private addMinimalMetadata(options: PDFExportOptions): void {
    this.addSectionHeader('Document Information');
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(51, 65, 85);
    
    const metadata = [
      ['Export Date', new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })],
      ['Total Diagrams', this.getTotalDiagramCount(options.diagrams).toString()],
      ['Flowchart Types', this.getDiagramTypeCount(options.diagrams, 'flowchart').toString()],
      ['ER Diagram Types', this.getDiagramTypeCount(options.diagrams, 'er_diagram').toString()],
      ['Document Version', '1.0']
    ];

    // Create a clean metadata table
    const tableStartY = this.currentY;
    const rowHeight = 10;
    const colWidth = this.contentWidth / 2;
    
    for (let i = 0; i < metadata.length; i++) {
      const [label, value] = metadata[i];
      const y = tableStartY + (i * rowHeight);
      
      // Background for alternating rows
      if (i % 2 === 0) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(this.margin, y - 2, this.contentWidth, rowHeight + 2, 'F');
      }
      
      // Border
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.2);
      this.doc.rect(this.margin, y - 2, this.contentWidth, rowHeight + 2, 'S');
      
      // Label
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(51, 65, 85);
      this.doc.text(label, this.margin + 8, y + 6);
      
      // Value
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(71, 85, 105);
      this.doc.text(value, this.margin + colWidth + 8, y + 6);
    }
    
    this.currentY = tableStartY + (metadata.length * rowHeight) + 15;
  }

  /**
   * Add new page
   */
  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  /**
   * Split text to fit page width with proper margins
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
