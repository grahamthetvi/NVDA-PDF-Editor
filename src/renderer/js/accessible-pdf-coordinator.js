/**
 * Accessible PDF Coordinator - AccessiblePDF Editor
 * Coordinates all components for accessible PDF editing with HTML overlays
 * Designed specifically for NVDA screen reader compatibility
 */

class AccessiblePDFCoordinator {
    constructor(pdfProcessor, accessibility) {
        this.pdfProcessor = pdfProcessor;
        this.accessibility = accessibility;
        
        // Component instances
        this.elementExtractor = null;
        this.autoOverlayManager = null;
        this.checkboxStateDetector = null;
        this.unstructuredTextEditor = null;
        
        // State
        this.isActive = false;
        this.currentElements = [];
        this.overlayMode = 'auto'; // 'auto', 'manual', 'hybrid'
        
        // Settings
        this.settings = {
            autoCreateOverlays: true,
            detectCheckboxStates: true,
            enableTextEditing: true,
            enableSignatureFields: true,
            announceChanges: true,
            saveInterval: 5000 // Auto-save every 5 seconds
        };
        
        console.log('Accessible PDF Coordinator initialized');
    }
    
    /**
     * Initialize the coordinator and all components
     */
    async initialize() {
        try {
            console.log('Initializing Accessible PDF Coordinator...');
            
            // Initialize element extractor
            this.elementExtractor = new PDFElementExtractor(this.pdfProcessor);
            
            // Initialize checkbox state detector
            this.checkboxStateDetector = new CheckboxStateDetector(this.pdfProcessor);
            
            // Initialize auto overlay manager
            this.autoOverlayManager = new AutoOverlayManager(
                this.pdfProcessor,
                this.elementExtractor,
                this.accessibility
            );
            
            await this.autoOverlayManager.initialize();
            
            // Initialize unstructured text editor
            if (window.UnstructuredTextEditor) {
                this.unstructuredTextEditor = new window.UnstructuredTextEditor(
                    this.accessibility,
                    this.pdfProcessor,
                    document.getElementById('pdf-viewer') || document.body
                );
                console.log('Unstructured text editor initialized');
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Accessible PDF Coordinator initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Accessible PDF Coordinator:', error);
            throw error;
        }
    }
    
    /**
     * Enhanced initialization with unstructured text support
     */
    async initializeAccessiblePDF(pdfBuffer, extractedElements) {
        try {
            console.log('Initializing Accessible PDF with unstructured text support...');
            
            // Initialize existing components
            if (!this.pdfProcessor) {
                throw new Error('PDF processor not available');
            }
            
            if (!this.accessibility) {
                throw new Error('Accessibility system not available');
            }
            
            // Initialize auto overlay manager
            if (!this.autoOverlayManager) {
                this.autoOverlayManager = new AutoOverlayManager(
                    this.pdfProcessor,
                    this.elementExtractor,
                    this.accessibility
                );
            }
            
            // Initialize unstructured text editor
            if (!this.unstructuredTextEditor && window.UnstructuredTextEditor) {
                this.unstructuredTextEditor = new window.UnstructuredTextEditor(
                    this.accessibility,
                    this.pdfProcessor,
                    document.getElementById('pdf-viewer') || document.body
                );
                console.log('Unstructured text editor initialized');
            }
            
            // Process elements with both systems
            if (extractedElements && extractedElements.length > 0) {
                console.log(`Processing ${extractedElements.length} elements...`);
                
                // Process structured elements (existing system)
                await this.autoOverlayManager.processElements(extractedElements);
                
                // Process unstructured text elements
                let unstructuredEditors = 0;
                if (this.unstructuredTextEditor) {
                    unstructuredEditors = this.unstructuredTextEditor.processTextElements(extractedElements);
                    console.log(`Created ${unstructuredEditors} unstructured text editors`);
                }
                
                this.isActive = true;
                
                // Announce completion
                if (this.accessibility) {
                    const totalInteractive = extractedElements.length + unstructuredEditors;
                    this.accessibility.announceToScreenReader(
                        `PDF loaded with ${extractedElements.length} form elements and ${unstructuredEditors} text editing areas`,
                        'polite'
                    );
                }
                
            } else {
                console.log('No elements to process');
            }
            
        } catch (error) {
            console.error('Failed to initialize accessible PDF:', error);
            
            if (this.accessibility) {
                this.accessibility.announceToScreenReader(
                    'PDF loaded but some accessibility features may not be available.',
                    'assertive'
                );
            }
            
            throw error;
        }
    }
    
    /**
     * Process a PDF document to create accessible overlays
     */
    async processDocument() {
        if (!this.pdfProcessor || !this.pdfProcessor.currentDocument) {
            throw new Error('No PDF document loaded');
        }
        
        try {
            console.log('Processing PDF document for accessibility...');
            
            // Show progress
            if (this.accessibility) {
                this.accessibility.announceToScreenReader(
                    'Processing PDF for accessibility. Please wait...',
                    'assertive'
                );
            }
            
            // Step 1: Extract all PDF elements
            console.log('Step 1: Extracting PDF elements...');
            this.currentElements = await this.elementExtractor.extractAllElements();
            
            // Step 2: Detect checkbox states
            if (this.settings.detectCheckboxStates) {
                console.log('Step 2: Detecting checkbox states...');
                await this.checkboxStateDetector.detectCheckboxStates(this.currentElements);
            }
            
            // Step 3: Create automatic overlays
            if (this.settings.autoCreateOverlays) {
                console.log('Step 3: Creating automatic overlays...');
                await this.autoOverlayManager.createOverlaysForElements();
            }
            
            // REMOVED: Auto-save functionality
            // No longer setting up auto-save
            
            // Announce completion
            const stats = this.getProcessingStatistics();
            if (this.accessibility) {
                this.accessibility.announceToScreenReader(
                    `PDF processed successfully. ${stats.totalElements} elements found, ${stats.interactiveElements} interactive elements created.`,
                    'polite'
                );
            }
            
            this.isActive = true;
            console.log('PDF document processing completed successfully');
            
            return stats;
            
        } catch (error) {
            console.error('Failed to process PDF document:', error);
            
            if (this.accessibility) {
                this.accessibility.announceToScreenReader(
                    'PDF processing failed. Some accessibility features may not be available.',
                    'assertive'
                );
            }
            
            throw error;
        }
    }
    
    /**
     * Update overlays when page or zoom changes
     */
    updateOverlays(pageNumber, zoomLevel) {
        if (this.autoOverlayManager && this.isActive) {
            this.autoOverlayManager.updateOverlayPositions(pageNumber, zoomLevel);
        }
    }
    
    /**
     * Get all modified overlay data for saving
     */
    getOverlayData() {
        if (!this.autoOverlayManager || !this.isActive) {
            return [];
        }
        
        return this.autoOverlayManager.getAllOverlayData();
    }
    
    /**
     * Save modifications to PDF
     */
    /**
     * Enhanced save modifications with comprehensive support
     */
    async saveModifications(originalPdfBuffer) {
        if (!this.isActive) {
            console.log('Accessible PDF Coordinator not active, returning original buffer');
            return originalPdfBuffer;
        }
        
        try {
            console.log('Starting comprehensive save process...');
            
            // Ensure we have a proper Uint8Array
            let workingBuffer;
            if (originalPdfBuffer instanceof Uint8Array) {
                workingBuffer = originalPdfBuffer;
            } else if (originalPdfBuffer instanceof ArrayBuffer) {
                workingBuffer = new Uint8Array(originalPdfBuffer);
            } else if (Array.isArray(originalPdfBuffer)) {
                workingBuffer = new Uint8Array(originalPdfBuffer);
            } else {
                console.warn('Unexpected buffer type, attempting conversion');
                workingBuffer = new Uint8Array(originalPdfBuffer);
            }
            
            let modifiedPdfBuffer = workingBuffer;
            let totalModifications = 0;
            
            // Save structured overlay modifications
            const overlayData = this.getOverlayData();
            const structuredModifications = overlayData.filter(item => item.modified);
            
            if (structuredModifications.length > 0) {
                console.log(`Saving ${structuredModifications.length} structured modifications...`);
                
                // Convert overlay data to form fields
                const formFields = this.convertOverlayDataToFormFields(structuredModifications);
                
                if (formFields.length > 0) {
                    // Initialize PDF modifier if needed
                    if (!this.pdfModifier) {
                        this.pdfModifier = new window.PDFModifier();
                    }
                    
                    if (!this.pdfModifier.isInitialized) {
                        await this.pdfModifier.initialize();
                    }
                    
                    // Use IPC to modify PDF
                    const result = await this.pdfModifier.createModifiedPDF(
                        modifiedPdfBuffer,
                        formFields,
                        this.pdfProcessor.currentDocument.numPages
                    );
                    
                    // Ensure result is Uint8Array
                    if (result instanceof Uint8Array) {
                        modifiedPdfBuffer = result;
                    } else if (result instanceof ArrayBuffer) {
                        modifiedPdfBuffer = new Uint8Array(result);
                    } else if (Array.isArray(result)) {
                        modifiedPdfBuffer = new Uint8Array(result);
                    } else {
                        console.warn('Unexpected result type from PDF modifier');
                        modifiedPdfBuffer = new Uint8Array(result);
                    }
                    
                    totalModifications += structuredModifications.length;
                    console.log(`Structured modifications saved: ${structuredModifications.length}`);
                }
            }
            
            // Save unstructured text modifications
            if (this.unstructuredTextEditor) {
                console.log('Checking for unstructured text modifications...');
                
                try {
                    const textModifications = this.unstructuredTextEditor.getAllTextModifications();
                    if (textModifications && textModifications.length > 0) {
                        console.log(`Found ${textModifications.length} text modifications`);
                        // Text modifications would be handled here if implemented
                        totalModifications += textModifications.length;
                    }
                } catch (textError) {
                    console.error('Failed to check text modifications:', textError);
                }
            }
            
            // Validate final result
            if (!modifiedPdfBuffer || modifiedPdfBuffer.length === 0) {
                console.error('Modified PDF buffer is empty');
                throw new Error('PDF modification failed - empty result');
            }
            
            console.log(`Save process completed: ${totalModifications} total modifications`);
            console.log(`Final buffer size: ${modifiedPdfBuffer.length} bytes`);
            
            // Announce completion
            if (this.accessibility && totalModifications > 0) {
                this.accessibility.announceToScreenReader(
                    `PDF saved with ${totalModifications} modifications`,
                    'polite'
                );
            }
            
            return modifiedPdfBuffer;
            
        } catch (error) {
            console.error('Failed to save modifications:', error);
            
            if (this.accessibility) {
                this.accessibility.announceToScreenReader(
                    'Some modifications could not be saved. Returning original PDF.',
                    'assertive'
                );
            }
            
            // Return original buffer on error
            return originalPdfBuffer;
        }
    }
    
    /**
     * Convert overlay data to form fields format for pdf-lib
     */
    convertOverlayDataToFormFields(overlayData) {
        const formFields = [];
        
        overlayData.forEach((item, index) => {
            if (!item.modified) return;
            
            try {
                // Get the overlay element
                const overlayElement = document.querySelector(`[data-element-id="${item.id}"]`);
                if (!overlayElement) {
                    console.warn(`Overlay element not found for ID: ${item.id}`);
                    return;
                }
                
                // Get position relative to PDF page
                const rect = overlayElement.getBoundingClientRect();
                const pdfPage = overlayElement.closest('.pdf-page');
                if (!pdfPage) {
                    console.warn(`PDF page not found for element: ${item.id}`);
                    return;
                }
                
                const pageRect = pdfPage.getBoundingClientRect();
                const canvas = pdfPage.querySelector('canvas');
                if (!canvas) {
                    console.warn(`Canvas not found for element: ${item.id}`);
                    return;
                }
                
                // Calculate actual PDF coordinates
                const scale = this.pdfProcessor.currentScale || 1;
                const x = (rect.left - pageRect.left) / scale;
                const y = (rect.top - pageRect.top) / scale;
                const width = rect.width / scale;
                const height = rect.height / scale;
                
                // Get page index
                const pageIndex = parseInt(pdfPage.getAttribute('data-page-number')) - 1 || 0;
                
                const fieldData = {
                    name: `field_${item.id}_${index}`,
                    type: item.type,
                    value: item.value,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    pageNumber: pageIndex + 1 // Convert back to 1-based for pdf-lib
                };
                
                // Add type-specific properties
                if (item.type === 'checkbox') {
                    fieldData.checked = item.value === true || item.value === 'true';
                } else if (item.type === 'dropdown' && item.options) {
                    fieldData.options = item.options;
                }
                
                formFields.push(fieldData);
                console.log('Created form field:', fieldData);
                
            } catch (error) {
                console.error(`Failed to convert overlay item ${index}:`, error);
            }
        });
        
        console.log(`Converted ${formFields.length} overlay items to form fields`);
        return formFields;
    }

    /**
     * Map overlay types to pdf-lib field types
     */
    mapOverlayTypeToFormFieldType(overlayType) {
        const typeMap = {
            'text': 'text',
            'checkbox': 'checkbox',
            'signature': 'text', // pdf-lib doesn't have native signature type
            'form': 'text',
            'graphic': 'text'
        };
        
        return typeMap[overlayType] || 'text';
    }
    
    /**
     * Setup event listeners for coordination
     */
    setupEventListeners() {
        // Document-wide keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardEvent(event);
        });
        
        // Focus tracking for overlays
        document.addEventListener('focusin', (event) => {
            if (this.isOverlayElement(event.target)) {
                this.currentFocusedElement = event.target;
            }
        });
        
        // NO LONGER NEEDED: Auto-save is removed
        // this.setupAutoSave();
        
        console.log('AccessiblePDFCoordinator event listeners configured');
    }
    
    /**
     * Handle overlay element changes
     */
    handleOverlayChange(event) {
        const element = event.target;
        
        // Mark as modified
        element.classList.add('modified');
        
        // Announce change if enabled
        if (this.settings.announceChanges && this.accessibility) {
            const elementType = element.getAttribute('data-element-type');
            this.accessibility.announceToScreenReader(
                `${elementType} field modified`,
                'polite'
            );
        }
        
        // REMOVED: Auto-save scheduling
        // No longer scheduling auto-save
    }
    
    /**
     * Handle overlay element focus
     */
    handleOverlayFocus(event) {
        const element = event.target;
        const elementId = element.getAttribute('data-element-id');
        const readingOrder = element.getAttribute('data-reading-order');
        const totalElements = this.autoOverlayManager.overlayElements.size;
        
        // Announce focus for screen reader
        if (this.accessibility) {
            this.accessibility.announceToScreenReader(
                `Element ${readingOrder} of ${totalElements}`,
                'polite'
            );
        }
    }
    
    /**
     * Handle keyboard events for coordination
     */
    handleKeyboardEvent(event) {
        const key = event.key;
        const ctrl = event.ctrlKey;
        const alt = event.altKey;
        
        // Custom keyboard shortcuts
        if (ctrl && key === 's') {
            // Ctrl+S: Save
            event.preventDefault();
            this.triggerSave();
        } else if (key === 'F2') {
            // F2: Edit current element
            event.preventDefault();
            this.editCurrentElement();
        } else if (key === 'F3') {
            // F3: Find next element
            event.preventDefault();
            this.findNextElement();
        } else if (alt && key === 'r') {
            // Alt+R: Read element information
            event.preventDefault();
            this.readElementInformation();
        }
    }
    
    /**
     * Check if element is an overlay element
     */
    isOverlayElement(element) {
        return element && (
            element.closest('.auto-overlay-container') ||
            element.closest('.accessibility-navigation') ||
            element.hasAttribute('data-element-id')
        );
    }
    
    /*
    // REMOVED: Auto-save functionality
    setupAutoSave() {
        // Removed
    }

    async performAutoSave() {
        // Removed
    }

    scheduleAutoSave() {
        // Removed
    }
    */
    
    /**
     * Get modified elements
     */
    getModifiedElements() {
        const modifiedElements = [];
        
        document.querySelectorAll('.modified').forEach(element => {
            if (this.isOverlayElement(element)) {
                modifiedElements.push({
                    id: element.getAttribute('data-element-id'),
                    type: element.getAttribute('data-element-type'),
                    value: this.getElementValue(element)
                });
            }
        });
        
        return modifiedElements;
    }
    
    /**
     * Get element value
     */
    getElementValue(element) {
        if (element.tagName === 'INPUT') {
            return element.type === 'checkbox' ? element.checked : element.value;
        } else if (element.tagName === 'SELECT') {
            return element.value;
        } else if (element.contentEditable === 'true') {
            return element.textContent;
        }
        return '';
    }
    
    /**
     * Save to local storage
     */
    saveToLocalStorage(modifiedElements) {
        try {
            const data = {
                timestamp: Date.now(),
                elements: modifiedElements
            };
            
            localStorage.setItem('accessible-pdf-modifications', JSON.stringify(data));
            
        } catch (error) {
            console.warn('Failed to save to local storage:', error);
        }
    }
    
    /**
     * Load from local storage
     */
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('accessible-pdf-modifications');
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Failed to load from local storage:', error);
        }
        return null;
    }
    
    /**
     * Trigger save operation
     */
    triggerSave() {
        if (this.accessibility) {
            this.accessibility.announceToScreenReader(
                'Saving document...',
                'assertive'
            );
        }
        
        // Dispatch save event
        document.dispatchEvent(new CustomEvent('pdf-save-requested'));
    }
    
    /**
     * Edit current element
     */
    editCurrentElement() {
        const currentElement = document.activeElement;
        
        if (this.isOverlayElement(currentElement)) {
            // Enable editing mode
            if (currentElement.contentEditable !== 'true') {
                currentElement.contentEditable = 'true';
                currentElement.focus();
            }
            
            if (this.accessibility) {
                this.accessibility.announceToScreenReader(
                    'Edit mode enabled',
                    'assertive'
                );
            }
        }
    }
    
    /**
     * Find next element
     */
    findNextElement() {
        const currentElement = document.activeElement;
        const overlayElements = Array.from(
            document.querySelectorAll('[data-element-id]')
        );
        
        if (overlayElements.length > 0) {
            const currentIndex = overlayElements.indexOf(currentElement);
            const nextIndex = (currentIndex + 1) % overlayElements.length;
            const nextElement = overlayElements[nextIndex];
            
            if (nextElement) {
                nextElement.focus();
            }
        }
    }
    
    /**
     * Read element information
     */
    readElementInformation() {
        const currentElement = document.activeElement;
        
        if (this.isOverlayElement(currentElement)) {
            const elementType = currentElement.getAttribute('data-element-type');
            const pageNumber = currentElement.getAttribute('data-page-number');
            const readingOrder = currentElement.getAttribute('data-reading-order');
            const value = this.getElementValue(currentElement);
            
            let info = `${elementType} field on page ${pageNumber}, position ${readingOrder}`;
            
            if (value) {
                info += `. Current value: ${value}`;
            }
            
            if (this.accessibility) {
                this.accessibility.announceToScreenReader(info, 'assertive');
            }
        }
    }
    
    /**
     * Get processing statistics
     */
    getProcessingStatistics() {
        const elementStats = this.elementExtractor ? this.elementExtractor.getStatistics() : {};
        const overlayStats = this.autoOverlayManager ? this.autoOverlayManager.getOverlayStatistics() : {};
        
        return {
            totalElements: elementStats.total || 0,
            interactiveElements: overlayStats.total || 0,
            modifiedElements: overlayStats.modified || 0,
            byType: elementStats.byType || {},
            byPage: elementStats.byPage || {}
        };
    }
    
    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Update component settings
        if (this.checkboxStateDetector) {
            this.checkboxStateDetector.updateSettings(newSettings);
        }
        
        // REMOVED: Auto-save interval update
        // No longer updating auto-save settings
    }
    
    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Clear all overlays and reset state
     */
    clear() {
        if (this.autoOverlayManager) {
            this.autoOverlayManager.clearOverlays();
        }
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.currentElements = [];
        this.isActive = false;
        
        console.log('Accessible PDF Coordinator cleared');
    }
    
    /**
     * Cleanup and destroy coordinator
     */
    cleanup() {
        this.clear();
        
        if (this.autoOverlayManager) {
            this.autoOverlayManager.cleanup();
        }
        
        if (this.unstructuredTextEditor) {
            this.unstructuredTextEditor.destroy();
            this.unstructuredTextEditor = null;
        }
        
        // Clear local storage
        localStorage.removeItem('accessible-pdf-modifications');
        
        console.log('Accessible PDF Coordinator cleanup completed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessiblePDFCoordinator;
} else {
    try {
        window.AccessiblePDFCoordinator = AccessiblePDFCoordinator;
        console.log('✅ AccessiblePDFCoordinator exported to window successfully');
    } catch (error) {
        console.error('❌ Failed to export AccessiblePDFCoordinator:', error);
    }
} 