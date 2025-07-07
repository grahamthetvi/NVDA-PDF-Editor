/**
 * Enhanced Auto Overlay Manager - Professional Text Editing
 * Fixed styling and editability issues for Teachers of the Visually Impaired
 */

class AutoOverlayManager {
    constructor(accessibility, pdfProcessor) {
        this.accessibility = accessibility;
        this.pdfProcessor = pdfProcessor;
        this.overlayElements = new Map();
        this.containers = new Map();
        this.tabIndexCounter = 1000;
        this.autoSaveTimeout = null;
        this.editingStrategy = new EnhancedTextEditingStrategy(accessibility, pdfProcessor);
        
        // Initialize professional styling
        this.initializeProfessionalStyling();
    }

    /**
     * Initialize professional CSS for overlays
     */
    initializeProfessionalStyling() {
        const existingStyle = document.getElementById('professional-overlay-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'professional-overlay-styles';
        style.textContent = `
            /* Professional PDF Text Overlay Styles */
            .pdf-text-overlay-container {
            position: absolute;
            z-index: 15;
                pointer-events: none;
            }

            .pdf-text-overlay {
            position: absolute;
            pointer-events: auto;
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                border-radius: 4px;
                transition: all 0.2s ease;
                outline: none;
                box-sizing: border-box;
                background: transparent;
                border: 2px solid transparent;
                color: inherit;
                line-height: 1.3;
                padding: 4px 6px;
                margin: 0;
                resize: none;
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
                min-height: 24px;
            }

            /* Editable text overlays */
            .pdf-text-overlay.editable {
                background: rgba(37, 99, 235, 0.08);
                border: 2px solid rgba(37, 99, 235, 0.3);
                cursor: text;
            }

            .pdf-text-overlay.editable:hover {
                background: rgba(37, 99, 235, 0.12);
                border-color: rgba(37, 99, 235, 0.5);
            }

            .pdf-text-overlay.editable:focus {
                background: rgba(37, 99, 235, 0.15);
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
                outline: none;
            }

            /* Modified state */
            .pdf-text-overlay.modified {
                background: rgba(22, 163, 74, 0.1);
                border-color: rgba(22, 163, 74, 0.4);
            }

            .pdf-text-overlay.modified:focus {
                background: rgba(22, 163, 74, 0.15);
                border-color: #16a34a;
                box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
            }

            /* Read-only text overlays */
            .pdf-text-overlay.readonly {
                background: transparent;
                border: 1px solid transparent;
                cursor: default;
                pointer-events: auto;
            }

            .pdf-text-overlay.readonly:focus {
                border-color: rgba(148, 163, 184, 0.5);
                box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.2);
            }

            /* Text area styling for multi-line content */
            .pdf-text-overlay.multiline {
                white-space: pre-wrap;
                min-height: 40px;
                resize: both;
                overflow: auto;
            }

            /* Modification indicator */
            .modification-indicator {
                position: absolute;
                top: -8px;
                right: -8px;
                width: 16px;
                height: 16px;
                background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                border: 2px solid #ffffff;
                border-radius: 50%;
                z-index: 20;
                box-shadow: 0 2px 4px rgba(22, 163, 74, 0.3);
            }

            .modification-indicator::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 6px;
                height: 6px;
                background: #ffffff;
                border-radius: 50%;
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .pdf-text-overlay.editable {
                    background: #ffffff !important;
                    border: 3px solid #000000 !important;
                    color: #000000 !important;
                }

                .pdf-text-overlay.editable:focus {
                    box-shadow: 0 0 0 4px #000000 !important;
                }
            }

            /* Screen reader optimizations */
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `;
        
        document.head.appendChild(style);
        console.log('Professional overlay styling initialized');
    }

    /**
     * Create professional text overlay element
     */
    createTextOverlay(element) {
        const isEditable = element.isEditable || this.isTextEditable(element);
        const isMultiline = this.isMultilineText(element);
        
        // Create appropriate input element
        let overlay;
        if (isEditable && isMultiline) {
            overlay = document.createElement('textarea');
            overlay.className = 'pdf-text-overlay editable multiline';
        } else if (isEditable) {
            overlay = document.createElement('input');
            overlay.type = 'text';
            overlay.className = 'pdf-text-overlay editable';
        } else {
            overlay = document.createElement('div');
            overlay.className = 'pdf-text-overlay readonly';
            overlay.setAttribute('tabindex', '0'); // Make focusable for screen readers
        }
        
        // Set content
        if (overlay.tagName === 'TEXTAREA' || overlay.tagName === 'INPUT') {
            overlay.value = element.text || '';
        } else {
        overlay.textContent = element.text || '';
        }

        // Enhanced accessibility attributes
        this.setAccessibilityAttributes(overlay, element, isEditable);

        // Set positioning and sizing
        this.setElementDimensions(overlay, element);

        // Add event listeners for editing
        if (isEditable) {
            this.addEditingEventListeners(overlay, element);
        }

        // Add modification indicator container
        const container = document.createElement('div');
        container.className = 'pdf-text-overlay-container';
        container.style.cssText = `
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            z-index: 15;
        `;
        container.appendChild(overlay);
        
        return container;
    }
    
    /**
     * Set professional accessibility attributes
     */
    setAccessibilityAttributes(overlay, element, isEditable) {
        const elementType = element.type || 'text';
        const textContent = element.text || '';
        
        overlay.id = `overlay-${element.id}`;
        overlay.setAttribute('data-element-id', element.id);
        overlay.setAttribute('data-element-type', elementType);
        overlay.setAttribute('tabindex', this.getNextTabIndex());

        if (isEditable) {
            overlay.setAttribute('role', overlay.tagName === 'TEXTAREA' ? 'textbox' : 'textbox');
            overlay.setAttribute('aria-label', 
                `Editable ${elementType} field: ${this.truncateText(textContent, 50) || 'Empty field'}`
            );
            overlay.setAttribute('aria-multiline', overlay.tagName === 'TEXTAREA' ? 'true' : 'false');
            overlay.setAttribute('aria-required', element.required ? 'true' : 'false');
        } else {
            overlay.setAttribute('role', 'text');
            overlay.setAttribute('aria-label', `${elementType}: ${textContent}`);
            overlay.setAttribute('aria-readonly', 'true');
        }

        // Add context information
        if (element.pageNumber) {
            overlay.setAttribute('aria-describedby', `page-${element.pageNumber}-description`);
        }
    }

    /**
     * Set element dimensions and positioning
     */
    setElementDimensions(overlay, element) {
        const fontSize = Math.max(element.fontSize || 12, 10);
        const padding = 4;
        
        overlay.style.cssText += `
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            font-size: ${fontSize}px;
            font-family: ${element.fontFamily || "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"};
            box-sizing: border-box;
        `;
    }

    /**
     * Add professional editing event listeners
     */
    addEditingEventListeners(overlay, element) {
        let isModified = false;
        let originalValue = overlay.value || overlay.textContent;

        // Input/change events
        const updateHandler = () => {
            const currentValue = overlay.value || overlay.textContent;
            const hasChanged = currentValue !== originalValue;
            
            if (hasChanged && !isModified) {
                isModified = true;
                overlay.classList.add('modified');
                this.addModificationIndicator(overlay.parentElement);
                this.announceModification(element);
                this.scheduleAutoSave();
            } else if (!hasChanged && isModified) {
                isModified = false;
                overlay.classList.remove('modified');
                this.removeModificationIndicator(overlay.parentElement);
            }
        };

        overlay.addEventListener('input', updateHandler);
        overlay.addEventListener('change', updateHandler);

        // Focus events
        overlay.addEventListener('focus', () => {
            this.accessibility.announceToScreenReader(
                `Editing ${element.type || 'text'} field: ${this.truncateText(element.text, 30)}`,
                'polite'
            );
        });

        overlay.addEventListener('blur', () => {
            if (isModified) {
                this.saveElementModification(overlay, element);
            }
        });

        // Keyboard navigation
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                overlay.blur();
            } else if (e.key === 'Enter' && !e.shiftKey && overlay.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.focusNextOverlay(overlay);
            }
        });
    }

    /**
     * Add visual modification indicator
     */
    addModificationIndicator(container) {
        if (container.querySelector('.modification-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'modification-indicator';
        indicator.setAttribute('aria-label', 'Modified field');
        container.appendChild(indicator);
    }

    /**
     * Remove modification indicator
     */
    removeModificationIndicator(container) {
        const indicator = container.querySelector('.modification-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    /**
     * Announce modification to screen reader
     */
    announceModification(element) {
        this.accessibility.announceToScreenReader(
            `${element.type || 'Text'} field modified`,
            'polite'
        );
    }

    /**
     * Check if text should be editable
     */
    isTextEditable(element) {
        // Enhanced logic for determining editability
        if (element.isFormField) return true;
        if (element.type === 'signature') return true;
        if (element.type === 'form') return true;
        
        // Check for form field patterns
        const text = (element.text || '').toLowerCase();
        const editablePatterns = [
            /^name:?\s*$/i,
            /^date:?\s*$/i,
            /^signature:?\s*$/i,
            /^sign here/i,
            /^\s*$/, // Empty fields
            /_+/, // Underscore lines
            /\.\.\.+/, // Dotted lines
        ];
        
        return editablePatterns.some(pattern => pattern.test(text));
    }

    /**
     * Check if text should be multiline
     */
    isMultilineText(element) {
        const text = element.text || '';
        const height = element.height || 0;
        const fontSize = element.fontSize || 12;
        
        // If height suggests multiple lines or text contains line breaks
        return height > (fontSize * 2) || text.includes('\n') || text.length > 100;
    }

    /**
     * Truncate text for accessibility labels
     */
    truncateText(text, maxLength = 50) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    /**
     * Get next tab index for proper navigation order
     */
    getNextTabIndex() {
        return this.tabIndexCounter++;
    }

    /**
     * Focus next overlay in tab order
     */
    focusNextOverlay(currentOverlay) {
        const allOverlays = Array.from(document.querySelectorAll('.pdf-text-overlay.editable'));
        const currentIndex = allOverlays.indexOf(currentOverlay);
        const nextOverlay = allOverlays[currentIndex + 1] || allOverlays[0];
        
        if (nextOverlay && nextOverlay !== currentOverlay) {
            nextOverlay.focus();
        }
    }
    
    /**
     * Save element modification
     */
    saveElementModification(overlay, element) {
        const newValue = overlay.value || overlay.textContent;
        element.text = newValue;
        element.modified = true;
        element.modifiedAt = new Date().toISOString();
        
        console.log(`Saved modification for element ${element.id}:`, newValue);
    }

    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
                this.accessibility.announceToScreenReader(
                'Auto-saving document changes',
                    'polite'
                );
        }, 2000);
    }

    // Legacy compatibility methods
    async initialize() {
        console.log('Enhanced Auto Overlay Manager initialized');
    }

    async createOverlaysForElements(elements) {
        if (!elements || elements.length === 0) return;
        
        elements.forEach(element => {
            const overlay = this.createTextOverlay(element);
            this.overlayElements.set(element.id, overlay);
        });
    }

    clearOverlays() {
        this.overlayElements.forEach(overlay => {
            if (overlay && overlay.parentElement) {
                overlay.parentElement.removeChild(overlay);
        }
        });
        this.overlayElements.clear();
    }

    cleanup() {
        this.clearOverlays();
        const style = document.getElementById('professional-overlay-styles');
        if (style) {
            style.remove();
        }
    }
}

/**
 * Enhanced Text Editing Strategy
 */
class EnhancedTextEditingStrategy {
    constructor(accessibility, pdfProcessor) {
        this.accessibility = accessibility;
        this.pdfProcessor = pdfProcessor;
        this.textModifications = new Map();
    }

    /**
     * Determine the best editing approach for a text element
     */
    determineEditingApproach(textElement) {
        const analysis = this.analyzeTextElement(textElement);
        
        if (analysis.isFormField) {
            return 'form';
        } else if (analysis.isSignature) {
            return 'signature';
        } else if (analysis.isEditable) {
            return 'overlay';
        } else {
            return 'readonly';
        }
    }

    /**
     * Analyze text element to determine characteristics
     */
    analyzeTextElement(textElement) {
        const text = textElement.text || '';
        const context = this.getElementContext(textElement);

        return {
            isFormField: this.hasFormIndicators(text, context),
            isSignature: /signature|sign here/i.test(text),
            isEditable: text.length < 200 && !this.isReadOnlyPattern(text),
            confidence: this.calculateConfidence(textElement),
            suggestedType: this.suggestFormFieldType(text, context)
        };
    }

    /**
     * Check if text has form field indicators
     */
    hasFormIndicators(text, context) {
        const formPatterns = [
            /^name:?\s*$/i,
            /^date:?\s*$/i,
            /^address:?\s*$/i,
            /^phone:?\s*$/i,
            /^email:?\s*$/i,
            /^\s*$/, // Empty fields
            /_+/, // Underscore lines
            /\.\.\.+/, // Dotted lines
        ];
        
        return formPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Check if text follows read-only patterns
     */
    isReadOnlyPattern(text) {
        const readOnlyPatterns = [
            /^(page|section|chapter)\s+\d+/i,
            /^(table|figure|image)\s+\d+/i,
            /^copyright|©/i,
            /^all rights reserved/i,
        ];
        
        return readOnlyPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Calculate confidence score for editability
     */
    calculateConfidence(textElement) {
        let score = 0.5; // Base score
        
        // Size indicators
        if (textElement.width > 100) score += 0.1;
        if (textElement.height > 20) score += 0.1;
        
        // Position indicators
        if (textElement.x > 50) score += 0.1; // Not at page edge
        
        // Text content indicators
        const text = textElement.text || '';
        if (text.length === 0) score += 0.2; // Empty fields likely editable
        if (text.length < 50) score += 0.1; // Short text more likely editable
        
        return Math.min(score, 1.0);
    }

    /**
     * Get context around element
     */
    getElementContext(textElement) {
        return {
            pageNumber: textElement.pageNumber,
            x: textElement.x,
            y: textElement.y,
            width: textElement.width,
            height: textElement.height
        };
    }

    /**
     * Suggest form field type based on text and context
     */
    suggestFormFieldType(text, context) {
        if (/name/i.test(text)) return 'text';
        if (/date/i.test(text)) return 'date';
        if (/signature/i.test(text)) return 'signature';
        if (/email/i.test(text)) return 'email';
        if (/phone/i.test(text)) return 'tel';
        return 'text';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutoOverlayManager, EnhancedTextEditingStrategy };
} else {
    window.AutoOverlayManager = AutoOverlayManager;
    window.EnhancedTextEditingStrategy = EnhancedTextEditingStrategy;
} 