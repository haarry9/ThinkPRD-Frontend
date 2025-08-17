import { api } from '@/lib/api';
import type { PRDDraftResponse, PRDSection } from '@/types/prd';

/**
 * PRD data management service with event-driven updates
 */
export class PRDService {
  /**
   * Get the current state of the PRD being built
   */
  async getPRDDraft(sessionId: string): Promise<PRDDraftResponse> {
    return await api.get<PRDDraftResponse>(`/sessions/${sessionId}/prd`);
  }

  /**
   * Get PRD content as formatted markdown
   */
  async getPRDMarkdown(sessionId: string): Promise<string> {
    const response = await this.getPRDDraft(sessionId);
    return response.prd_snapshot || '';
  }

  /**
   * Get completion progress summary
   */
  async getProgress(sessionId: string): Promise<{
    completed: number;
    total: number;
    percentage: number;
    currentSection: string | null;
    stage: string;
  }> {
    const response = await this.getPRDDraft(sessionId);
    
    const completedCount = Object.keys(response.sections_completed).length;
    const inProgressCount = Object.keys(response.sections_in_progress).length;
    const totalSections = 13; // As defined in the API docs

    return {
      completed: completedCount,
      total: totalSections,
      percentage: Math.round((completedCount / totalSections) * 100),
      currentSection: response.current_section || null,
      stage: response.current_stage,
    };
  }

  /**
   * Get sections that are ready for editing/review
   */
  async getEditableSections(sessionId: string) {
    const response = await this.getPRDDraft(sessionId);
    
    const completedSections = Object.values(response.sections_completed);
    const inProgressSections = Object.values(response.sections_in_progress);
    
    return {
      completed: completedSections,
      inProgress: inProgressSections,
      all: [...completedSections, ...inProgressSections],
    };
  }

  /**
   * Check if PRD has any critical issues
   */
  async validatePRD(sessionId: string): Promise<{
    isValid: boolean;
    issues: string[];
    missingRequiredSections: string[];
  }> {
    const response = await this.getPRDDraft(sessionId);
    
    const requiredSections = [
      'problem_statement',
      'goals',
      'success_metrics',
      'user_personas',
      'core_features',
      'user_flows',
      'constraints',
      'risks',
      'timeline'
    ];

    const completedSections = Object.keys(response.sections_completed);
    const missingRequiredSections = requiredSections.filter(
      section => !completedSections.includes(section)
    );

    return {
      isValid: response.issues.length === 0 && missingRequiredSections.length === 0,
      issues: response.issues,
      missingRequiredSections,
    };
  }

  /**
   * Compare two PRD states and detect changes
   */
  detectChanges(
    currentPRD: PRDDraftResponse | null,
    newPRD: PRDDraftResponse
  ): {
    hasChanges: boolean;
    changedSections: string[];
    addedSections: string[];
    updatedSections: string[];
    contentChanged: boolean;
    progressChanged: boolean;
  } {
    if (!currentPRD) {
      return {
        hasChanges: true,
        changedSections: Object.keys(newPRD.sections_completed),
        addedSections: Object.keys(newPRD.sections_completed),
        updatedSections: [],
        contentChanged: true,
        progressChanged: true,
      };
    }

    const currentCompleted = currentPRD.sections_completed;
    const newCompleted = newPRD.sections_completed;
    const currentInProgress = currentPRD.sections_in_progress;
    const newInProgress = newPRD.sections_in_progress;

    const changedSections: string[] = [];
    const addedSections: string[] = [];
    const updatedSections: string[] = [];

    // Check for new sections
    Object.keys(newCompleted).forEach(key => {
      if (!currentCompleted[key]) {
        addedSections.push(key);
        changedSections.push(key);
      } else if (
        currentCompleted[key].content !== newCompleted[key].content ||
        currentCompleted[key].last_updated !== newCompleted[key].last_updated
      ) {
        updatedSections.push(key);
        changedSections.push(key);
      }
    });

    // Check for changes in in-progress sections
    Object.keys(newInProgress).forEach(key => {
      if (!currentInProgress[key]) {
        if (!currentCompleted[key]) {
          addedSections.push(key);
        }
        changedSections.push(key);
      } else if (
        currentInProgress[key].content !== newInProgress[key].content ||
        currentInProgress[key].last_updated !== newInProgress[key].last_updated
      ) {
        updatedSections.push(key);
        changedSections.push(key);
      }
    });

    const contentChanged = currentPRD.prd_snapshot !== newPRD.prd_snapshot;
    const progressChanged = currentPRD.progress !== newPRD.progress;

    return {
      hasChanges: changedSections.length > 0 || contentChanged || progressChanged,
      changedSections,
      addedSections,
      updatedSections,
      contentChanged,
      progressChanged,
    };
  }

  /**
   * Get detailed diff for a specific section
   */
  getSectionDiff(
    oldSection: PRDSection | undefined,
    newSection: PRDSection
  ): {
    type: 'added' | 'updated' | 'unchanged';
    oldContent: string;
    newContent: string;
    contentDiff: string[];
  } {
    if (!oldSection) {
      return {
        type: 'added',
        oldContent: '',
        newContent: newSection.content,
        contentDiff: [`+ ${newSection.content}`],
      };
    }

    if (oldSection.content === newSection.content) {
      return {
        type: 'unchanged',
        oldContent: oldSection.content,
        newContent: newSection.content,
        contentDiff: [],
      };
    }

    // Simple line-by-line diff (can be enhanced with proper diff algorithm)
    const oldLines = oldSection.content.split('\n');
    const newLines = newSection.content.split('\n');
    const diff: string[] = [];

    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine !== newLine) {
        if (oldLine) diff.push(`- ${oldLine}`);
        if (newLine) diff.push(`+ ${newLine}`);
      } else if (oldLine) {
        diff.push(`  ${oldLine}`);
      }
    }

    return {
      type: 'updated',
      oldContent: oldSection.content,
      newContent: newSection.content,
      contentDiff: diff,
    };
  }
}

export const prdService = new PRDService();