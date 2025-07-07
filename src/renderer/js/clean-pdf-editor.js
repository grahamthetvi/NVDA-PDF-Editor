/**
 * Clean PDF Editor - No Visual Overlays Approach
 * Professional editing interface for Teachers of the Visually Impaired
 */

class CleanPDFEditor {
    constructor(accessibility, pdfProcessor) {
        this.accessibility = accessibility;
        this.pdfProcessor = pdfProcessor;
        this.editableElements = new Map();
        this.currentlyEditing = null;
        this.modifications = new Map();
        
        this.initializeEditor();
    }

    /**
     * Initialize the clean editing interface
     */
    initializeEditor() {
        this.createEditingPanel();
        this.updateElementList();
        this.setupKeyboardNavigation();
        
        console.log('Clean PDF Editor initialized');
    }

    /**
     * Process PDF elements for editing (no visual overlays)
     */
    processElements(extractedElements) {
        console.log(`Processing ${extractedElements.length} PDF elements`);
        
        // Clear existing data
        this.editableElements.clear();
        
        // Filter and process editable elements
        const editableElements = extractedElements.filter(element => 
            this.isElementEditable(element)
        );
        
        editableElements.forEach(element => {
            // Store element with enhanced metadata
            this.editableElements.set(element.id, {
                ...element,
                displayName: this.createDisplayName(element),
                originalText: element.text || '',
                modified: false
            });
        });
        
        // Update the editing interface
        this.updateElementList();
        this.updateEditingPanel();
        
        // Announce to screen reader
        this.accessibility.announceToScreenReader(
            `Found ${editableElements.length} editable fields. Use Tab to navigate to the editing panel.`,
            'polite'
        );
        
        return editableElements.length;
    }

    /**
     * Create the main editing panel (side panel approach)
     */
    createEditingPanel() {
        // Remove existing panel
        const existing = document.getElementById('clean-editing-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'clean-editing-panel';
        panel.innerHTML = `
            <div class="clean-panel-header">
                <h2 class="clean-panel-title">PDF Field Editor</h2>
                <button class="clean-panel-close" aria-label="Close editing panel">✕</button>
            </div>
            
            <div class="clean-panel-content">
                <div class="current-field-editor" id="current-field-editor">
                    <div class="no-field-selected">
                        <p>Select a field from the list below to edit</p>
                    </div>
                </div>
                
                <div class="field-list-container" id="field-list-container">
                    <h3>Editable Fields</h3>
                    <div class="field-list" id="field-list">
                        <!-- Fields will be populated here -->
                    </div>
                </div>
            </div>
            
            <div class="clean-panel-footer">
                <button class="btn-save-changes" id="btn-save-changes">Save All Changes</button>
                <button class="btn-clear-changes" id="btn-clear-changes">Clear Changes</button>
            </div>
        `;

        document.body.appendChild(panel);
        this.setupPanelEventListeners();
    }

    /**
     * Create clean field list interface
     */
    updateElementList() {
        const fieldList = document.getElementById('field-list');
        if (!fieldList) return;

        fieldList.innerHTML = '';

        if (this.editableElements.size === 0) {
            fieldList.innerHTML = `
                <div class="no-fields">
                    <p>No editable fields found in this PDF.</p>
                    <p>Load a PDF with form fields or text areas to begin editing.</p>
                </div>
            `;
            return;
        }

        this.editableElements.forEach((element, elementId) => {
            const fieldItem = document.createElement('div');
            fieldItem.className = 'field-list-item';
            fieldItem.setAttribute('data-element-id', elementId);
            fieldItem.setAttribute('tabindex', '0');
            fieldItem.setAttribute('role', 'button');
            fieldItem.setAttribute('aria-label', `Edit ${element.displayName}`);

            fieldItem.innerHTML = `
                <div class="field-info">
                    <div class="field-name">${element.displayName}</div>
                    <div class="field-details">
                        <span class="field-type">${element.type}</span>
                        <span class="field-page">Page ${element.pageNumber || 1}</span>
                        ${element.modified ? '<span class="field-modified">Modified</span>' : ''}
                    </div>
                    <div class="field-preview">${this.truncateText(element.text || '', 50)}</div>
                </div>
                <div class="field-actions">
                    <button class="btn-edit-field" aria-label="Edit this field">Edit</button>
                </div>
            `;

            // Event listeners
            fieldItem.addEventListener('click', () => this.selectFieldForEditing(elementId));
            fieldItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectFieldForEditing(elementId);
                }
            });

            fieldList.appendChild(fieldItem);
        });
    }

    /**
     * Select a field for editing (no overlay - clean interface)
     */
    selectFieldForEditing(elementId) {
        const element = this.editableElements.get(elementId);
        if (!element) return;

        this.currentlyEditing = elementId;
        
        // Update UI to show selected field
        this.updateSelectedFieldUI(elementId);
        
        // Create clean editing interface
        this.createFieldEditor(element);
        
        // Announce to screen reader
        this.accessibility.announceToScreenReader(
            `Now editing ${element.displayName}`,
            'assertive'
        );
    }

    /**
     * Create clean field editor (no visual overlays)
     */
    createFieldEditor(element) {
        const editorContainer = document.getElementById('current-field-editor');
        if (!editorContainer) return;

        let editorHTML = '';

        switch (element.type) {
            case 'text':
            case 'form':
                editorHTML = this.createTextFieldEditor(element);
                break;
            case 'checkbox':
                editorHTML = this.createCheckboxEditor(element);
                break;
            case 'signature':
                editorHTML = this.createSignatureEditor(element);
                break;
            default:
                editorHTML = this.createTextFieldEditor(element);
        }

        editorContainer.innerHTML = editorHTML;
        this.setupEditorEventListeners(element);
        
        // Focus the main input
        const mainInput = editorContainer.querySelector('input, textarea, select');
        if (mainInput) {
            setTimeout(() => mainInput.focus(), 100);
        }
    }

    /**
     * Create text field editor interface
     */
    createTextFieldEditor(element) {
        const isMultiline = (element.text || '').length > 100 || (element.text || '').includes('\n');
        
        return `
            <div class="field-editor-container">
                <div class="field-editor-header">
                    <h4>${element.displayName}</h4>
                    <div class="field-editor-meta">
                        <span>Type: ${element.type}</span>
                        <span>Page: ${element.pageNumber || 1}</span>
                    </div>
                </div>
                
                <div class="field-editor-content">
                    <label for="field-input-${element.id}" class="field-label">
                        Field Content:
                    </label>
                    ${isMultiline ? 
                        `<textarea id="field-input-${element.id}" 
                                  class="field-input field-textarea" 
                                  rows="4"
                                  aria-describedby="field-help-${element.id}">${element.text || ''}</textarea>` :
                        `<input type="text" 
                               id="field-input-${element.id}" 
                               class="field-input" 
                               value="${element.text || ''}"
                               aria-describedby="field-help-${element.id}">`
                    }
                    <div id="field-help-${element.id}" class="field-help">
                        ${isMultiline ? 'Multi-line text field. Use Shift+Enter for new lines.' : 'Single-line text field.'}
                    </div>
                </div>
                
                <div class="field-editor-actions">
                    <button class="btn-apply-changes" data-element-id="${element.id}">
                        Apply Changes
                    </button>
                    <button class="btn-reset-field" data-element-id="${element.id}">
                        Reset to Original
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Create checkbox editor interface
     */
    createCheckboxEditor(element) {
        return `
            <div class="field-editor-container">
                <div class="field-editor-header">
                    <h4>${element.displayName}</h4>
                    <div class="field-editor-meta">
                        <span>Type: Checkbox</span>
                        <span>Page: ${element.pageNumber || 1}</span>
                    </div>
                </div>
                
                <div class="field-editor-content">
                    <div class="checkbox-editor">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   id="field-input-${element.id}"
                                   class="field-checkbox"
                                   ${element.checked ? 'checked' : ''}
                                   aria-describedby="field-help-${element.id}">
                            <span class="checkbox-text">${element.text || 'Checkbox'}</span>
                        </label>
                        <div id="field-help-${element.id}" class="field-help">
                            Check or uncheck this option.
                        </div>
                    </div>
                </div>
                
                <div class="field-editor-actions">
                    <button class="btn-apply-changes" data-element-id="${element.id}">
                        Apply Changes
                    </button>
                    <button class="btn-reset-field" data-element-id="${element.id}">
                        Reset to Original
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Create signature editor interface
     */
    createSignatureEditor(element) {
        return `
            <div class="field-editor-container">
                <div class="field-editor-header">
                    <h4>${element.displayName}</h4>
                    <div class="field-editor-meta">
                        <span>Type: Signature</span>
                        <span>Page: ${element.pageNumber || 1}</span>
                    </div>
                </div>
                
                <div class="field-editor-content">
                    <div class="signature-editor">
                        <label for="field-input-${element.id}" class="field-label">
                            Signature Text:
                        </label>
                        <input type="text" 
                               id="field-input-${element.id}" 
                               class="field-input signature-input" 
                               value="${element.text || ''}"
                               placeholder="Enter signature text"
                               aria-describedby="field-help-${element.id}">
                        <div id="field-help-${element.id}" class="field-help">
                            Enter text to appear in the signature field.
                        </div>
                        
                        <div class="signature-options">
                            <button class="btn-clear-signature" data-element-id="${element.id}">
                                Clear Signature
                            </button>
                            <button class="btn-signature-dialog" data-element-id="${element.id}">
                                Open Signature Options
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="field-editor-actions">
                    <button class="btn-apply-changes" data-element-id="${element.id}">
                        Apply Changes
                    </button>
                    <button class="btn-reset-field" data-element-id="${element.id}">
                        Reset to Original
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for the editing panel
     */
    setupPanelEventListeners() {
        // Close panel
        const closeBtn = document.querySelector('.clean-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideEditingPanel());
        }

        // Save all changes
        const saveBtn = document.getElementById('btn-save-changes');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAllChanges());
        }

        // Clear all changes
        const clearBtn = document.getElementById('btn-clear-changes');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllChanges());
        }
    }

    /**
     * Setup event listeners for individual field editors
     */
    setupEditorEventListeners(element) {
        const editorContainer = document.getElementById('current-field-editor');
        if (!editorContainer) return;

        // Apply changes button
        const applyBtn = editorContainer.querySelector('.btn-apply-changes');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyFieldChanges(element.id));
        }

        // Reset field button
        const resetBtn = editorContainer.querySelector('.btn-reset-field');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetField(element.id));
        }

        // Auto-apply changes on input
        const input = editorContainer.querySelector('input, textarea, select');
        if (input) {
            input.addEventListener('input', () => {
                this.markFieldAsModified(element.id);
            });
        }

        // Checkbox specific
        const checkbox = editorContainer.querySelector('.field-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                this.markFieldAsModified(element.id);
            });
        }
    }

    /**
     * Apply changes to a specific field
     */
    applyFieldChanges(elementId) {
        const element = this.editableElements.get(elementId);
        if (!element) return;

        const input = document.getElementById(`field-input-${elementId}`);
        if (!input) return;

        let newValue;
        if (input.type === 'checkbox') {
            newValue = input.checked;
            element.checked = newValue;
        } else {
            newValue = input.value;
            element.text = newValue;
        }

        element.modified = true;
        element.modifiedAt = new Date().toISOString();

        // Store modification
        this.modifications.set(elementId, {
            elementId,
            originalValue: element.originalText,
            newValue,
            type: element.type,
            timestamp: element.modifiedAt
        });

        // Update UI
        this.updateElementList();
        
        // Announce change
        this.accessibility.announceToScreenReader(
            `Changes applied to ${element.displayName}`,
            'polite'
        );

        console.log(`Applied changes to field ${elementId}:`, newValue);
    }

    /**
     * Reset a field to its original value
     */
    resetField(elementId) {
        const element = this.editableElements.get(elementId);
        if (!element) return;

        element.text = element.originalText;
        element.modified = false;
        delete element.modifiedAt;

        // Remove modification
        this.modifications.delete(elementId);

        // Update UI
        this.updateElementList();
        this.createFieldEditor(element);

        // Announce reset
        this.accessibility.announceToScreenReader(
            `${element.displayName} reset to original value`,
            'polite'
        );
    }

    /**
     * Save all modifications to PDF
     */
    async saveAllChanges() {
        if (this.modifications.size === 0) {
            this.accessibility.announceToScreenReader(
                'No changes to save',
                'polite'
            );
            return;
        }

        try {
            this.accessibility.announceToScreenReader(
                `Saving ${this.modifications.size} changes to PDF`,
                'assertive'
            );

            // Convert modifications to format expected by pdf-modifier
            const formFields = Array.from(this.modifications.values()).map(mod => ({
                id: mod.elementId,
                value: mod.newValue,
                type: mod.type
            }));

            // Save to PDF (integrate with your existing PDF saving logic)
            if (this.pdfProcessor.saveFormFields) {
                await this.pdfProcessor.saveFormFields(formFields);
            }

            this.accessibility.announceToScreenReader(
                'All changes saved successfully',
                'polite'
            );

        } catch (error) {
            console.error('Failed to save changes:', error);
            this.accessibility.announceToScreenReader(
                'Failed to save some changes',
                'assertive'
            );
        }
    }

    /**
     * Clear all modifications
     */
    clearAllChanges() {
        this.modifications.clear();
        
        // Reset all elements
        this.editableElements.forEach(element => {
            element.text = element.originalText;
            element.modified = false;
            delete element.modifiedAt;
        });

        // Update UI
        this.updateElementList();
        const editorContainer = document.getElementById('current-field-editor');
        if (editorContainer) {
            editorContainer.innerHTML = `
                <div class="no-field-selected">
                    <p>Select a field from the list below to edit</p>
                </div>
            `;
        }

        this.accessibility.announceToScreenReader(
            'All changes cleared',
            'polite'
        );
    }

    // Helper methods
    isElementEditable(element) {
        return element.type === 'text' || 
               element.type === 'form' || 
               element.type === 'checkbox' || 
               element.type === 'signature' ||
               element.isFormField ||
               this.hasEditablePatterns(element.text);
    }

    hasEditablePatterns(text) {
        if (!text) return false;
        const editablePatterns = [
            /^name:?\s*$/i,
            /^date:?\s*$/i,
            /^signature:?\s*$/i,
            /_+/,
            /\.\.\.+/
        ];
        return editablePatterns.some(pattern => pattern.test(text));
    }

    createDisplayName(element) {
        if (element.name) return element.name;
        if (element.text && element.text.trim()) {
            return this.truncateText(element.text.trim(), 30);
        }
        return `${element.type} field`;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    markFieldAsModified(elementId) {
        const element = this.editableElements.get(elementId);
        if (element) {
            element.modified = true;
        }
    }

    updateSelectedFieldUI(elementId) {
        // Remove previous selection
        document.querySelectorAll('.field-list-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to current item
        const item = document.querySelector(`[data-element-id="${elementId}"]`);
        if (item) {
            item.classList.add('selected');
        }
    }

    hideEditingPanel() {
        const panel = document.getElementById('clean-editing-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    showEditingPanel() {
        const panel = document.getElementById('clean-editing-panel');
        if (panel) {
            panel.style.display = 'flex';
        }
    }

    updateEditingPanel() {
        // Update panel visibility based on whether we have fields
        const panel = document.getElementById('clean-editing-panel');
        if (panel) {
            if (this.editableElements.size > 0) {
                panel.style.display = 'flex';
            }
        }
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+E to open editing panel
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.showEditingPanel();
                const firstField = document.querySelector('.field-list-item');
                if (firstField) firstField.focus();
            }
        });
    }

    cleanup() {
        const panel = document.getElementById('clean-editing-panel');
        if (panel) {
            panel.remove();
        }
        
        this.editableElements.clear();
        this.modifications.clear();
        
        console.log('Clean PDF Editor cleaned up');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CleanPDFEditor;
} else {
    window.CleanPDFEditor = CleanPDFEditor;
} 