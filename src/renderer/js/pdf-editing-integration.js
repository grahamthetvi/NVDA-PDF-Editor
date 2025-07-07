/**
 * PDF Editing Integration - Seamless Workflow
 * Integrates PDF Element Extractor with Clean PDF Editor
 * Professional editing interface for Teachers of the Visually Impaired
 */

class PDFEditingIntegration {
    constructor(accessibility, pdfProcessor) {
        // Your existing components
        this.accessibility = accessibility;
        this.pdfProcessor = pdfProcessor;
        this.elementExtractor = new PDFElementExtractor(pdfProcessor);
        
        // New clean editor (replaces overlay manager)
        this.cleanEditor = new CleanPDFEditor(accessibility, pdfProcessor);
        
        console.log('PDF Editing Integration initialized');
    }

    /**
     * Main workflow: Load PDF and enable editing
     */
    async loadPDFAndEnableEditing(pdfBuffer) {
        try {
            // 1. Load PDF with your existing PDF processor
            await this.pdfProcessor.loadPDF(pdfBuffer);
            
            // 2. Extract all elements using your existing extractor
            // This automatically sorts by reading order!
            const extractedElements = await this.elementExtractor.extractAllElements();
            
            console.log(`Extracted ${extractedElements.length} elements in reading order`);
            
            // 3. Process elements with clean editor (no overlays!)
            const editableCount = this.cleanEditor.processElements(extractedElements);
            
            // 4. Show the clean editing panel
            this.cleanEditor.showEditingPanel();
            
            // 5. Announce to screen reader
            this.accessibility.announceToScreenReader(
                `PDF loaded with ${editableCount} editable fields. Elements sorted in reading order: top to bottom, left to right.`,
                'polite'
            );
            
            // 6. Show statistics
            this.showExtractionStatistics(extractedElements);
            
            return { extractedElements, editableCount };
            
        } catch (error) {
            console.error('Failed to load PDF and enable editing:', error);
            throw error;
        }
    }

    /**
     * Show what was found and in what order
     */
    showExtractionStatistics(elements) {
        console.log('=== PDF EXTRACTION RESULTS ===');
        
        // Group by page for display
        const byPage = {};
        elements.forEach(element => {
            if (!byPage[element.pageNumber]) {
                byPage[element.pageNumber] = [];
            }
            byPage[element.pageNumber].push(element);
        });

        // Show reading order for each page
        Object.keys(byPage).forEach(pageNum => {
            console.log(`\nPage ${pageNum} (${byPage[pageNum].length} elements):`);
            
            byPage[pageNum].forEach((element, index) => {
                const preview = this.getElementPreview(element);
                console.log(`  ${element.readingOrder || index + 1}. [${element.type}] ${preview}`);
            });
        });

        // Show editable elements specifically
        const editableElements = elements.filter(el => this.cleanEditor.isElementEditable(el));
        console.log(`\n=== ${editableElements.length} EDITABLE FIELDS ===`);
        
        editableElements.forEach(element => {
            console.log(`${element.readingOrder || 'N/A'}. ${element.type} on page ${element.pageNumber}: "${element.text || 'Empty'}"`);
        });
    }

    /**
     * Get a preview of element content for logging
     */
    getElementPreview(element) {
        if (element.text) {
            const text = element.text.trim();
            return text.length > 50 ? text.substring(0, 50) + '...' : text;
        }
        return `[${element.type} at ${Math.round(element.x)}, ${Math.round(element.y)}]`;
    }

    /**
     * Example: Show reading order to user
     */
    announceReadingOrder() {
        const elements = this.elementExtractor.getAllElements();
        const editableElements = elements.filter(el => this.cleanEditor.isElementEditable(el));
        
        if (editableElements.length === 0) {
            this.accessibility.announceToScreenReader(
                'No editable fields found in this PDF',
                'polite'
            );
            return;
        }

        // Announce first few editable elements in order
        const firstFew = editableElements.slice(0, 3);
        const announcement = firstFew.map((el, index) => 
            `${index + 1}: ${el.type} field "${el.text || 'empty'}" on page ${el.pageNumber}`
        ).join('. ');

        this.accessibility.announceToScreenReader(
            `Found ${editableElements.length} editable fields in reading order. First fields: ${announcement}`,
            'polite'
        );
    }

    /**
     * Handle keyboard shortcut for reading order navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+R to announce reading order
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.announceReadingOrder();
            }
            
            // Ctrl+E to open editing panel
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.cleanEditor.showEditingPanel();
                
                // Focus first editable field in the list
                setTimeout(() => {
                    const firstField = document.querySelector('.field-list-item');
                    if (firstField) {
                        firstField.focus();
                    }
                }, 100);
            }
        });
    }

    /**
     * Save all changes back to PDF
     */
    async saveChanges() {
        try {
            // Get modifications from clean editor
            const modifications = Array.from(this.cleanEditor.modifications.values());
            
            if (modifications.length === 0) {
                this.accessibility.announceToScreenReader(
                    'No changes to save',
                    'polite'
                );
                return;
            }

            // Convert to format for your PDF modifier
            const formFields = modifications.map(mod => ({
                id: mod.elementId,
                value: mod.newValue,
                type: mod.type,
                pageNumber: this.getElementPageNumber(mod.elementId)
            }));

            // Use your existing PDF modification system
            const modifiedPDF = await this.pdfProcessor.modifyPDFWithFormFields(formFields);
            
            this.accessibility.announceToScreenReader(
                `Saved ${modifications.length} changes to PDF`,
                'polite'
            );

            return modifiedPDF;

        } catch (error) {
            console.error('Failed to save changes:', error);
            this.accessibility.announceToScreenReader(
                'Failed to save changes',
                'assertive'
            );
            throw error;
        }
    }

    /**
     * Get page number for an element ID
     */
    getElementPageNumber(elementId) {
        const element = this.elementExtractor.getElementById(elementId);
        return element ? element.pageNumber : 1;
    }

    /**
     * Cleanup when done
     */
    cleanup() {
        this.cleanEditor.cleanup();
        this.elementExtractor.clear();
        console.log('PDF Editing Integration cleaned up');
    }
}

// Export for use in your application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFEditingIntegration;
} else {
    window.PDFEditingIntegration = PDFEditingIntegration;
} 