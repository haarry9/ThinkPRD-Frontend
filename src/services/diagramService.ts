import { api } from '@/lib/api';
import type {
  FlowchartType,
  ERDiagramType,
  DiagramType,
  FlowchartRequest,
  FlowchartResponse,
  ERDiagramRequest,
  ERDiagramResponse,
} from '@/types/prd';

/**
 * Diagram generation service for flowcharts and ER diagrams
 */
export class DiagramService {
  /**
   * Generate a flowchart based on PRD data
   */
  async generateFlowchart(
    sessionId: string,
    type: FlowchartType = 'system_architecture'
  ): Promise<FlowchartResponse> {
    const request: FlowchartRequest = {
      flowchart_type: type,
    };

    return await api.post<FlowchartResponse>(
      `/sessions/${sessionId}/flowchart?flowchart_type=${type}`,
      request
    );
  }

  /**
   * Generate an ER diagram based on PRD data
   */
  async generateERDiagram(
    sessionId: string,
    type: ERDiagramType = 'database_schema'
  ): Promise<ERDiagramResponse> {
    const request: ERDiagramRequest = {
      diagram_type: type,
    };

    return await api.post<ERDiagramResponse>(
      `/sessions/${sessionId}/er-diagram?diagram_type=${type}`,
      request
    );
  }

  /**
   * Generate any diagram type (unified interface)
   */
  async generateDiagram(
    sessionId: string,
    type: DiagramType
  ): Promise<FlowchartResponse | ERDiagramResponse> {
    const flowchartTypes: FlowchartType[] = [
      'system_architecture',
      'user_flow',
      'data_flow',
      'deployment'
    ];

    const erDiagramTypes: ERDiagramType[] = [
      'database_schema',
      'data_model',
      'user_data_structure',
      'api_schema'
    ];

    if (flowchartTypes.includes(type as FlowchartType)) {
      return this.generateFlowchart(sessionId, type as FlowchartType);
    } else if (erDiagramTypes.includes(type as ERDiagramType)) {
      return this.generateERDiagram(sessionId, type as ERDiagramType);
    } else {
      throw new Error(`Unknown diagram type: ${type}`);
    }
  }

  /**
   * Get all available diagram types with descriptions
   */
  getAvailableDiagramTypes(): {
    flowcharts: { type: FlowchartType; label: string; description: string }[];
    erDiagrams: { type: ERDiagramType; label: string; description: string }[];
  } {
    return {
      flowcharts: [
        {
          type: 'system_architecture',
          label: 'System Architecture',
          description: 'System components, services, integrations, data flow'
        },
        {
          type: 'user_flow',
          label: 'User Flow',
          description: 'User journey, interactions, decision points, error handling'
        },
        {
          type: 'data_flow',
          label: 'Data Flow',
          description: 'Data sources, processing, storage, validation'
        },
        {
          type: 'deployment',
          label: 'Deployment',
          description: 'Development, staging, production, monitoring, backup'
        }
      ],
      erDiagrams: [
        {
          type: 'database_schema',
          label: 'Database Schema',
          description: 'Database entities, relationships, keys, cardinality'
        },
        {
          type: 'data_model',
          label: 'Data Model',
          description: 'Business entities, data flow, storage, validation rules'
        },
        {
          type: 'user_data_structure',
          label: 'User Data Structure',
          description: 'User profiles, roles, preferences, permissions'
        },
        {
          type: 'api_schema',
          label: 'API Schema',
          description: 'API endpoints, data structures, authentication, error handling'
        }
      ]
    };
  }

  /**
   * Check if a diagram type is a flowchart
   */
  isFlowchartType(type: DiagramType): type is FlowchartType {
    return ['system_architecture', 'user_flow', 'data_flow', 'deployment'].includes(type);
  }

  /**
   * Check if a diagram type is an ER diagram
   */
  isERDiagramType(type: DiagramType): type is ERDiagramType {
    return ['database_schema', 'data_model', 'user_data_structure', 'api_schema'].includes(type);
  }

  /**
   * Get diagram type category
   */
  getDiagramCategory(type: DiagramType): 'flowchart' | 'er_diagram' {
    return this.isFlowchartType(type) ? 'flowchart' : 'er_diagram';
  }

  /**
   * Validate Mermaid code
   */
  validateMermaidCode(code: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!code.trim()) {
      errors.push('Diagram code is empty');
      return { isValid: false, errors, warnings };
    }

    // Basic validation for Mermaid syntax
    if (!code.match(/^(flowchart|graph|erDiagram|sequenceDiagram)/)) {
      errors.push('Invalid Mermaid diagram type');
    }

    // Check for common syntax issues
    if (code.includes('-->') && !code.includes('flowchart')) {
      warnings.push('Using flowchart arrows without flowchart declaration');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get recommended diagram types based on PRD sections
   */
  getRecommendedDiagrams(completedSections: string[]): DiagramType[] {
    const recommendations: DiagramType[] = [];

    // System architecture for technical sections
    if (completedSections.includes('technical_architecture') || 
        completedSections.includes('core_features')) {
      recommendations.push('system_architecture');
    }

    // User flow for user-focused sections
    if (completedSections.includes('user_flows') || 
        completedSections.includes('user_personas')) {
      recommendations.push('user_flow');
    }

    // Data flow for data-heavy features
    if (completedSections.includes('core_features') || 
        completedSections.includes('technical_architecture')) {
      recommendations.push('data_flow');
    }

    // Database schema for data storage needs
    if (completedSections.includes('core_features') || 
        completedSections.includes('user_personas')) {
      recommendations.push('database_schema');
    }

    // Deployment for production-ready PRDs
    if (completedSections.includes('timeline') || 
        completedSections.includes('resources')) {
      recommendations.push('deployment');
    }

    return recommendations;
  }
}

export const diagramService = new DiagramService();