import { mermaid, initializeMermaid, sanitizeMermaid, renderMermaidSafe } from '@/utils/mermaid';
import html2canvas from 'html2canvas';
import type { DiagramData } from '@/types/prd';

export interface RenderedDiagram {
  id: string;
  name: string;
  type: string;
  svgElement: SVGElement;
  width: number;
  height: number;
}

export class DiagramRendererService {
  private static instance: DiagramRendererService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DiagramRendererService {
    if (!DiagramRendererService.instance) {
      DiagramRendererService.instance = new DiagramRendererService();
    }
    return DiagramRendererService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await initializeMermaid('default');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize diagram renderer:', error);
      throw error;
    }
  }

  /**
   * Render a diagram and return the SVG element
   */
  async renderDiagram(diagram: DiagramData): Promise<RenderedDiagram | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const sanitized = sanitizeMermaid(diagram.mermaidCode);
      if (!sanitized) {
        console.warn('Invalid Mermaid code for diagram:', diagram.name);
        return null;
      }

      // Create a temporary container for rendering
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.height = '600px';
      container.style.background = '#ffffff';
      document.body.appendChild(container);

      try {
        const id = `mmd-export-${Math.random().toString(36).slice(2)}`;
        const svg = await renderMermaidSafe(id, sanitized);
        
        if (!svg) {
          throw new Error('Failed to render diagram');
        }

        container.innerHTML = svg;
        
        // Wait for the SVG to be fully rendered
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const svgElement = container.querySelector('svg') as SVGElement;
        if (!svgElement) {
          throw new Error('SVG element not found');
        }

        // Apply PDF-friendly styles
        this.applyPDFStyles(svgElement);

        // Get dimensions
        const bbox = svgElement.getBBox();
        const width = bbox.width || 800;
        const height = bbox.height || 600;

        return {
          id: diagram.id,
          name: diagram.name,
          type: diagram.type,
          svgElement,
          width,
          height
        };

      } finally {
        // Clean up temporary container
        document.body.removeChild(container);
      }

    } catch (error) {
      console.error('Failed to render diagram:', diagram.name, error);
      return null;
    }
  }

  /**
   * Render multiple diagrams
   */
  async renderDiagrams(diagrams: DiagramData[]): Promise<RenderedDiagram[]> {
    const rendered: RenderedDiagram[] = [];
    
    for (const diagram of diagrams) {
      try {
        const renderedDiagram = await this.renderDiagram(diagram);
        if (renderedDiagram) {
          rendered.push(renderedDiagram);
        }
      } catch (error) {
        console.error(`Failed to render diagram ${diagram.name}:`, error);
      }
    }
    
    return rendered;
  }

  /**
   * Apply PDF-friendly styles to SVG
   */
  private applyPDFStyles(svgElement: SVGElement): void {
    // Ensure text elements are visible
    const textElements = svgElement.querySelectorAll('text, tspan, .nodeLabel, .edgeLabel, .label');
    textElements.forEach((el: any) => {
      el.style.fill = '#000000';
      el.style.color = '#000000';
      el.style.stroke = 'none';
      el.style.fontFamily = 'Arial, sans-serif';
      el.style.fontSize = '12px';
      el.style.fontWeight = '500';
    });

    // Ensure stroke colors are visible
    const pathElements = svgElement.querySelectorAll('.edgePath .path, .flowchart-link, path, line');
    pathElements.forEach((el: any) => {
      if (el.style.stroke === 'transparent' || el.style.stroke === 'none') {
        el.style.stroke = '#1f2937';
      }
      el.style.strokeWidth = '2px';
    });

    // Ensure node backgrounds are light with dark borders
    const nodeElements = svgElement.querySelectorAll('.node rect, .node circle, .node ellipse, .node polygon');
    nodeElements.forEach((el: any) => {
      el.style.fill = '#f8fafc';
      el.style.stroke = '#1f2937';
      el.style.strokeWidth = '2px';
    });

    // Edge label backgrounds to white
    const edgeLabelRects = svgElement.querySelectorAll('.edgeLabel rect');
    edgeLabelRects.forEach((el: any) => {
      el.style.fill = '#ffffff';
      el.style.stroke = '#e5e7eb';
      el.style.strokeWidth = '1px';
    });

    // Set SVG background and ensure proper dimensions
    svgElement.style.background = '#ffffff';
    svgElement.style.border = '1px solid #e5e7eb';
    
    // Ensure SVG has proper viewBox and dimensions
    if (!svgElement.getAttribute('viewBox')) {
      const bbox = svgElement.getBBox();
      svgElement.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    }
    
    // Set explicit width and height
    svgElement.setAttribute('width', '800');
    svgElement.setAttribute('height', '600');
  }

  /**
   * Convert SVG to data URL for PDF inclusion using html2canvas
   */
  async convertSVGToDataURL(svgElement: SVGElement): Promise<string> {
    try {
      // Create a temporary container for the SVG
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.height = '600px';
      container.style.background = '#ffffff';
      container.style.padding = '20px';
      container.style.boxSizing = 'border-box';
      
      // Clone the SVG and add it to the container
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      container.appendChild(clonedSvg);
      document.body.appendChild(container);
      
      try {
        // Use html2canvas to convert the container to canvas
        const canvas = await html2canvas(container, {
          width: 800,
          height: 600,
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution for better quality
          useCORS: true,
          allowTaint: true,
          logging: false
        });
        
        // Convert canvas to data URL
        const dataURL = canvas.toDataURL('image/png', 0.95);
        
        return dataURL;
        
      } finally {
        // Clean up
        document.body.removeChild(container);
      }
      
    } catch (error) {
      console.error('Failed to convert SVG to data URL:', error);
      return '';
    }
  }

  /**
   * Get diagram dimensions for PDF layout
   */
  getDiagramDimensions(diagram: RenderedDiagram): { width: number; height: number; scale: number } {
    const maxWidth = 150; // mm, fits in A4 with margins
    const maxHeight = 180; // mm
    
    let scale = 1;
    let width = diagram.width;
    let height = diagram.height;
    
    // Scale down if too large
    if (width > maxWidth || height > maxHeight) {
      const scaleX = maxWidth / width;
      const scaleY = maxHeight / height;
      scale = Math.min(scaleX, scaleY);
      
      width = width * scale;
      height = height * scale;
    }
    
    return { width, height, scale };
  }
}

export const diagramRendererService = DiagramRendererService.getInstance();
