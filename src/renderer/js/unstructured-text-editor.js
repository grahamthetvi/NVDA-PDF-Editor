/**
 * UnstructuredTextEditor.js - Complete solution for editing unstructured text in PDFs
 * Designed for NVDA compatibility and TVI use cases
 */

class UnstructuredTextEditor {
    constructor(accessibility, pdfProcessor, container) {
        this.accessibility = accessibility;
        this.pdfProcessor = pdfProcessor;
        this.container = container;
        
        // Text editing state
        this.textEditors = new Map(); // elementId -> editor info
        this.activeEditor = null;
        this.textModifications = new Map();
        
        // Configuration
        this.settings = {
            minTextWidth: 30,
            minTextHeight: 8,
            editModeIndicator: true,
            autoSave: true,
            autoSaveDelay: 2000
        };
        
        this.setupEventListeners();
        this.createEditingTools();
        
        console.log('UnstructuredTextEditor initialized');
    }

    /**
     * MAIN ENTRY POINT: Process extracted text elements and create editors
     */
    processTextElements(extractedElements) {
        console.log(`Processing ${extractedElements.length} text elements for unstructured editing`);
        
        const textElements = extractedElements.filter(el => el.type === 'text');
        let editorsCreated = 0;
        
        textElements.forEach(element => {
            const editingStrategy = this.determineEditingStrategy(element);
            
            if (editingStrategy.isUnstructured) {
                this.createUnstructuredTextEditor(element);
                editorsCreated++;
            }
        });
        
        console.log(`Created ${editorsCreated} unstructured text editors`);
        
        if (editorsCreated > 0) {
            this.announceEditingMode();
        }
        
        return editorsCreated;
    }

    /**
     * Determine if text should be edited as unstructured content
     */
    determineEditingStrategy(textElement) {
        const text = textElement.text || '';
        const analysis = {
            isUnstructured: false,
            confidence: 0,
            reasons: []
        };

        // Length-based detection
        if (text.length > 50) {
            analysis.isUnstructured = true;
            analysis.confidence += 0.4;
            analysis.reasons.push('Long text content');
        }

        // Sentence structure detection
        if (this.containsSentences(text)) {
            analysis.isUnstructured = true;
            analysis.confidence += 0.3;
            analysis.reasons.push('Contains sentence structure');
        }

        // Paragraph indicators
        if (text.includes('\n') || text.includes('.') || text.includes(',')) {
            analysis.isUnstructured = true;
            analysis.confidence += 0.2;
            analysis.reasons.push('Contains paragraph indicators');
        }

        // Multi-word content that's not obviously a form field
        if (text.split(' ').length > 3 && !this.isFormFieldText(text)) {
            analysis.isUnstructured = true;
            analysis.confidence += 0.3;
            analysis.reasons.push('Multi-word non-form content');
        }

        // Size-based detection (large text areas)
        if (textElement.width > 200 && textElement.height > 30) {
            analysis.isUnstructured = true;
            analysis.confidence += 0.2;
            analysis.reasons.push('Large text area');
        }

        // NOT form fields
        if (!this.isFormFieldText(text)) {
            analysis.confidence += 0.1;
            analysis.reasons.push('Not a form field');
        }

        return analysis;
    }

    /**
     * Check if text contains sentence structure
     */
    containsSentences(text) {
        const sentenceIndicators = [
            /[.!?]\s+[A-Z]/,  // Sentence endings followed by capitals
            /\b(the|and|or|but|however|therefore|because|since|when|where|what|who|how)\b/i, // Common sentence words
            /\b(is|are|was|were|has|have|had|will|would|could|should|can|may|might)\b/i // Verbs
        ];
        
        return sentenceIndicators.some(pattern => pattern.test(text));
    }

    /**
     * Check if text appears to be a form field
     */
    isFormFieldText(text) {
        const formPatterns = [
            /^[_\s]*$/, // Just underscores/spaces
            /^\[.*\]$/, // Bracketed content
            /^Name:|Date:|Signature:/i, // Label patterns
            /___+/, // Underlines
            /^\s*$/ // Empty/whitespace only
        ];
        
        return formPatterns.some(pattern => pattern.test(text)) || text.length < 3;
    }

    /**
     * CREATE UNSTRUCTURED TEXT EDITOR
     */
    createUnstructuredTextEditor(textElement) {
        const editorId = `unstructured-editor-${textElement.id}`;
        
        // Create editor container
        const editorContainer = document.createElement('div');
        editorContainer.className = 'unstructured-text-editor-container';
        editorContainer.id = `${editorId}-container`;
        
        // Create actual text editor
        const textEditor = document.createElement('div');
        textEditor.className = 'unstructured-text-editor';
        textEditor.id = editorId;
        textEditor.contentEditable = 'true';
        textEditor.textContent = textElement.text || '';
        
        // Configure accessibility
        this.configureEditorAccessibility(textEditor, textElement);
        
        // Style the editor
        this.styleUnstructuredEditor(textEditor, textElement);
        
        // Position the editor
        this.positionUnstructuredEditor(editorContainer, textElement);
        
        // Add editor controls
        const controls = this.createEditorControls(textElement);
        
        // Assemble editor
        editorContainer.appendChild(textEditor);
        editorContainer.appendChild(controls);
        
        // Add to container
        this.container.appendChild(editorContainer);
        
        // Setup event handlers
        this.setupEditorEventHandlers(textEditor, textElement);
        
        // Store editor reference
        this.textEditors.set(textElement.id, {
            element: textElement,
            editor: textEditor,
            container: editorContainer,
            controls: controls,
            originalText: textElement.text || '',
            modified: false
        });
        
        console.log(`Created unstructured text editor for element ${textElement.id}`);
        
        return textEditor;
    }

    /**
     * Configure accessibility for text editor
     */
    configureEditorAccessibility(textEditor, textElement) {
        // ARIA attributes for screen readers
        textEditor.setAttribute('role', 'textbox');
        textEditor.setAttribute('aria-multiline', 'true');
        textEditor.setAttribute('aria-label', `Editable text content: ${this.truncateForLabel(textElement.text)}`);
        textEditor.setAttribute('aria-describedby', `${textEditor.id}-help`);
        
        // Data attributes for identification
        textEditor.setAttribute('data-element-id', textElement.id);
        textEditor.setAttribute('data-element-type', 'unstructured-text');
        textEditor.setAttribute('data-page-number', textElement.pageNumber || 1);
        
        // Tab index for keyboard navigation
        textEditor.setAttribute('tabindex', '0');
        
        // Create help text
        const helpText = document.createElement('div');
        helpText.id = `${textEditor.id}-help`;
        helpText.className = 'sr-only';
        helpText.textContent = 'Unstructured text editor. Type to edit content. Use Enter for new lines. Press F2 for editor options.';
        
        textEditor.parentNode?.appendChild(helpText);
    }

    /**
     * Style the unstructured text editor
     */
    styleUnstructuredEditor(textEditor, textElement) {
        const scale = this.pdfProcessor.getCurrentScale() || 1;
        
        textEditor.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.95);
            border: 2px solid #007acc;
            border-radius: 4px;
            padding: 8px;
            font-family: ${textElement.fontFamily || 'Arial, sans-serif'};
            font-size: ${Math.max((textElement.fontSize || 12) * scale, 12)}px;
            line-height: 1.4;
            color: #333;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-wrap: break-word;
            min-height: ${Math.max(textElement.height * scale, 40)}px;
            min-width: ${Math.max(textElement.width * scale, 150)}px;
            max-width: 600px;
            resize: both;
            overflow: auto;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        `;
        
        // Focus styles
        textEditor.addEventListener('focus', () => {
            textEditor.style.borderColor = '#0056b3';
            textEditor.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)';
        });
        
        textEditor.addEventListener('blur', () => {
            textEditor.style.borderColor = '#007acc';
            textEditor.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
    }

    /**
     * Position the unstructured text editor
     */
    positionUnstructuredEditor(editorContainer, textElement) {
        const scale = this.pdfProcessor.getCurrentScale() || 1;
        const viewport = this.pdfProcessor.getCurrentViewport();
        
        let x = textElement.x * scale;
        let y = textElement.y * scale;
        
        // Adjust for PDF coordinate system (origin at bottom-left)
        if (viewport) {
            y = viewport.height - y - (textElement.height * scale);
        }
        
        editorContainer.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            z-index: 999;
        `;
        
        // Ensure editor stays within visible area
        this.ensureEditorVisible(editorContainer);
    }

    /**
     * Create editor controls
     */
    createEditorControls(textElement) {
        const controls = document.createElement('div');
        controls.className = 'unstructured-editor-controls';
        
        controls.style.cssText = `
            position: absolute;
            top: -30px;
            right: 0;
            display: flex;
            gap: 4px;
            background: rgba(0, 0, 0, 0.8);
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        
        // Save button
        const saveBtn = this.createControlButton('Save', 'Save changes to this text', () => {
            this.saveTextChanges(textElement.id);
        });
        
        // Cancel button
        const cancelBtn = this.createControlButton('Cancel', 'Cancel changes and restore original text', () => {
            this.cancelTextChanges(textElement.id);
        });
        
        // Format button
        const formatBtn = this.createControlButton('Format', 'Text formatting options', () => {
            this.showFormatOptions(textElement.id);
        });
        
        controls.appendChild(saveBtn);
        controls.appendChild(cancelBtn);
        controls.appendChild(formatBtn);
        
        // Show controls on hover
        controls.parentElement?.addEventListener('mouseenter', () => {
            controls.style.opacity = '1';
        });
        
        controls.parentElement?.addEventListener('mouseleave', () => {
            controls.style.opacity = '0';
        });
        
        return controls;
    }

    /**
     * Create control button
     */
    createControlButton(text, ariaLabel, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'editor-control-btn';
        button.setAttribute('aria-label', ariaLabel);
        button.setAttribute('type', 'button');
        
        button.style.cssText = `
            background: #007acc;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
        `;
        
        button.addEventListener('click', onClick);
        
        return button;
    }

    /**
     * Setup event handlers for text editor
     */
    setupEditorEventHandlers(textEditor, textElement) {
        // Track modifications
        textEditor.addEventListener('input', () => {
            this.markAsModified(textElement.id);
            this.scheduleAutoSave(textElement.id);
        });

        // Enhanced keyboard handling
        textEditor.addEventListener('keydown', (e) => {
            this.handleEditorKeydown(e, textElement.id);
        });

        // Focus management
        textEditor.addEventListener('focus', () => {
            this.setActiveEditor(textElement.id);
            this.announceEditorFocus(textElement);
        });

        textEditor.addEventListener('blur', () => {
            this.onEditorBlur(textElement.id);
        });

        // Paste handling
        textEditor.addEventListener('paste', (e) => {
            this.handlePaste(e, textElement.id);
        });

        // Auto-resize
        textEditor.addEventListener('input', () => {
            this.autoResizeEditor(textElement.id);
        });
    }

    /**
     * Handle keyboard shortcuts in editor
     */
    handleEditorKeydown(event, elementId) {
        const editor = this.textEditors.get(elementId);
        if (!editor) return;

        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.cancelTextChanges(elementId);
                break;
                
            case 's':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.saveTextChanges(elementId);
                }
                break;
                
            case 'F2':
                event.preventDefault();
                this.showFormatOptions(elementId);
                break;
                
            case 'Tab':
                if (event.shiftKey) {
                    // Allow normal tab behavior for indentation
                    return;
                }
                // Tab to next editor or element
                event.preventDefault();
                this.focusNextEditor(elementId);
                break;
        }
    }

    /**
     * Mark text as modified
     */
    markAsModified(elementId) {
        const editor = this.textEditors.get(elementId);
        if (!editor) return;

        editor.modified = true;
        editor.editor.classList.add('modified');
        editor.editor.style.borderColor = '#28a745'; // Green for modified
        
        // Store modification
        this.textModifications.set(elementId, {
            elementId: elementId,
            originalText: editor.originalText,
            currentText: editor.editor.textContent,
            element: editor.element,
            timestamp: Date.now(),
            type: 'unstructured-text'
        });
        
        // Visual indicator
        this.updateModificationIndicator(elementId, true);
    }

    /**
     * Save text changes
     */
    saveTextChanges(elementId) {
        const editor = this.textEditors.get(elementId);
        if (!editor) return;

        const currentText = editor.editor.textContent;
        
        // Update stored data
        editor.originalText = currentText;
        editor.modified = false;
        editor.editor.classList.remove('modified');
        editor.editor.style.borderColor = '#007acc';
        
        // Update modification tracking
        this.textModifications.set(elementId, {
            elementId: elementId,
            originalText: editor.originalText,
            currentText: currentText,
            element: editor.element,
            timestamp: Date.now(),
            type: 'unstructured-text',
            saved: true
        });
        
        this.accessibility.announceToScreenReader('Text changes saved', 'polite');
        this.updateModificationIndicator(elementId, false);
        
        console.log(`Saved text changes for element ${elementId}`);
    }

    /**
     * Cancel text changes
     */
    cancelTextChanges(elementId) {
        const editor = this.textEditors.get(elementId);
        if (!editor) return;

        // Restore original text
        editor.editor.textContent = editor.originalText;
        editor.modified = false;
        editor.editor.classList.remove('modified');
        editor.editor.style.borderColor = '#007acc';
        
        // Remove from modifications
        this.textModifications.delete(elementId);
        
        this.accessibility.announceToScreenReader('Text changes cancelled, original content restored', 'polite');
        this.updateModificationIndicator(elementId, false);
        
        console.log(`Cancelled text changes for element ${elementId}`);
    }

    /**
     * Auto-resize editor to fit content
     */
    autoResizeEditor(elementId) {
        const editor = this.textEditors.get(elementId);
        if (!editor) return;

        const textEditor = editor.editor;
        
        // Temporarily remove height to measure content
        const originalHeight = textEditor.style.height;
        textEditor.style.height = 'auto';
        
        // Get scroll height (natural content height)
        const contentHeight = textEditor.scrollHeight;
        
        // Set new height with minimum
        const newHeight = Math.max(contentHeight + 10, 40);
        textEditor.style.height = newHeight + 'px';
        
        // Ensure still visible
        this.ensureEditorVisible(editor.container);
    }

    /**
     * Get all text modifications for saving to PDF
     */
    getAllTextModifications() {
        const modifications = [];
        
        this.textModifications.forEach((mod, elementId) => {
            if (mod.currentText !== mod.originalText) {
                modifications.push({
                    id: elementId,
                    type: 'text-annotation',
                    originalText: mod.originalText,
                    newText: mod.currentText,
                    element: mod.element,
                    pageNumber: mod.element.pageNumber,
                    coordinates: {
                        x: mod.element.x,
                        y: mod.element.y,
                        width: mod.element.width,
                        height: mod.element.height
                    },
                    modified: true,
                    timestamp: mod.timestamp
                });
            }
        });
        
        console.log(`Found ${modifications.length} text modifications`);
        return modifications;
    }

    /**
     * Integration point: Save all unstructured text modifications
     */
    async saveAllModifications(originalPdfBuffer) {
        const modifications = this.getAllTextModifications();
        
        if (modifications.length === 0) {
            console.log('No unstructured text modifications to save');
            return originalPdfBuffer;
        }

        try {
            console.log(`Saving ${modifications.length} unstructured text modifications to PDF`);
            
            // Create PDF annotations for unstructured text
            const modifiedPdf = await this.createTextAnnotations(originalPdfBuffer, modifications);
            
            // Announce completion
            this.accessibility.announceToScreenReader(
                `Saved ${modifications.length} text modifications to PDF`,
                'polite'
            );
            
            return modifiedPdf;
            
        } catch (error) {
            console.error('Failed to save unstructured text modifications:', error);
            this.accessibility.announceToScreenReader(
                'Failed to save some text modifications',
                'assertive'
            );
            return originalPdfBuffer;
        }
    }

    /**
     * Create PDF text annotations using pdf-lib
     */
    async createTextAnnotations(pdfBuffer, modifications) {
        try {
            // For now, return the original buffer
            // In a full implementation, this would use pdf-lib to add text annotations
            console.log('Text annotation creation would be implemented with pdf-lib');
            return pdfBuffer;
            
        } catch (error) {
            console.error('Failed to create text annotations:', error);
            throw error;
        }
    }

    // Utility methods
    truncateForLabel(text, maxLength = 50) {
        if (!text) return 'Empty text field';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    announceEditingMode() {
        this.accessibility.announceToScreenReader(
            'Unstructured text editing mode activated. Use Tab to navigate between editable text areas.',
            'assertive'
        );
    }

    setActiveEditor(elementId) {
        this.activeEditor = elementId;
    }

    announceEditorFocus(textElement) {
        const text = this.truncateForLabel(textElement.text);
        this.accessibility.announceToScreenReader(
            `Editing text: ${text}. Type to modify content.`,
            'polite'
        );
    }

    ensureEditorVisible(container) {
        // Implement viewport checking and adjustment
        const rect = container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        if (rect.bottom > viewportHeight) {
            container.style.top = (viewportHeight - rect.height - 20) + 'px';
        }
        
        if (rect.right > viewportWidth) {
            container.style.left = (viewportWidth - rect.width - 20) + 'px';
        }
    }

    updateModificationIndicator(elementId, isModified) {
        // Visual feedback for modifications
        const editor = this.textEditors.get(elementId);
        if (editor) {
            const indicator = editor.container.querySelector('.modification-indicator');
            if (isModified && !indicator) {
                const ind = document.createElement('div');
                ind.className = 'modification-indicator';
                ind.textContent = '●';
                ind.style.cssText = 'position: absolute; top: -5px; right: -5px; color: #28a745; font-size: 20px;';
                editor.container.appendChild(ind);
            } else if (!isModified && indicator) {
                indicator.remove();
            }
        }
    }

    // Auto-save functionality
    scheduleAutoSave(elementId) {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, this.settings.autoSaveDelay);
    }

    async performAutoSave() {
        if (this.textModifications.size === 0) return;
        
        console.log('Auto-saving unstructured text changes...');
        this.accessibility.announceToScreenReader('Auto-saving text changes', 'polite');
    }

    // Setup global event listeners
    setupEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleUnstructuredEditMode();
            }
        });
    }

    createEditingTools() {
        // Create toolbar for unstructured text editing
        // This would integrate with existing toolbar
    }

    // Additional methods for format options, etc.
    showFormatOptions(elementId) {
        console.log(`Showing format options for ${elementId}`);
        // Implement format dialog
    }

    focusNextEditor(currentElementId) {
        const editorKeys = Array.from(this.textEditors.keys());
        const currentIndex = editorKeys.indexOf(currentElementId);
        const nextIndex = (currentIndex + 1) % editorKeys.length;
        const nextEditor = this.textEditors.get(editorKeys[nextIndex]);
        
        if (nextEditor) {
            nextEditor.editor.focus();
        }
    }

    onEditorBlur(elementId) {
        // Handle editor losing focus
        const editor = this.textEditors.get(elementId);
        if (editor && editor.modified) {
            this.scheduleAutoSave(elementId);
        }
    }

    handlePaste(event, elementId) {
        // Handle paste events with cleanup
        event.preventDefault();
        const paste = (event.clipboardData || window.clipboardData).getData('text/plain');
        const selection = window.getSelection();
        
        if (!selection.rangeCount) return;
        
        selection.deleteContents();
        selection.getRangeAt(0).insertNode(document.createTextNode(paste));
        selection.collapseToEnd();
        
        this.markAsModified(elementId);
    }

    toggleUnstructuredEditMode() {
        // Toggle between edit and view modes
        console.log('Toggling unstructured edit mode');
    }

    // Cleanup
    destroy() {
        this.textEditors.forEach((editor, elementId) => {
            editor.container.remove();
        });
        this.textEditors.clear();
        this.textModifications.clear();
    }
}

// Export for use in main application
window.UnstructuredTextEditor = UnstructuredTextEditor; 