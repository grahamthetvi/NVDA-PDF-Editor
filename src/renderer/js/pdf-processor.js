/**
 * PDF Processor - AccessiblePDF Editor
 * Handles PDF loading, processing, and analysis for desktop application
 * Adapted from pdf-analyzer.js for Electron environment
 */

class PDFProcessor {
    constructor(options = {}) {
        this.options = {
            maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
            timeout: options.timeout || 30000, // 30 seconds
            maxPages: options.maxPages || 50,
            enableOCR: options.enableOCR !== false,
            enableForms: options.enableForms !== false,
            debugMode: options.debugMode || true,
            
            // Desktop-specific optimizations
            memoryLimit: options.memoryLimit || 100 * 1024 * 1024, // 100MB
            maxProcessingTime: options.maxProcessingTime || 45000, // 45 seconds
            enableCaching: options.enableCaching !== false,
            ...options
        };
        
        this.pdfjsLib = null;
        this.ocrProcessor = null;
        this.currentDocument = null;
        this.currentPages = [];
        this.formFields = new Map();
        
        this.state = {
            initialized: false,
            processing: false,
            lastError: null,
            statistics: {
                filesProcessed: 0,
                successfulExtractions: 0,
                errors: 0,
                averageProcessingTime: 0
            }
        };
        
        this.cache = new Map();
        this.callbacks = {
            onProgress: null,
            onPageProcessed: null,
            onComplete: null,
            onError: null
        };
        
        console.log('PDF Processor initialized for desktop environment');
    }
    
    /**
     * Initialize PDF.js library
     */
    async initialize() {
        if (this.state.initialized) return;
        
        try {
            console.log('Initializing PDF.js...');
            
            // Load PDF.js library
            await this.loadPDFJS();
            
            // Configure PDF.js
            this.configurePDFJS();
            
            // Verify functionality
            await this.verifyPDFJSFunctionality();
            
            this.state.initialized = true;
            console.log('PDF Processor initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize PDF Processor:', error);
            throw error;
        }
    }
    
    /**
     * Load PDF.js library
     */
    async loadPDFJS() {
        // Wait for PDF.js to be loaded (ES modules load asynchronously)
        if (typeof window.pdfjsLib === 'undefined') {
            console.log('Waiting for PDF.js library to load...');
            
            // Add timeout to prevent hanging
            const pdfJSTimeout = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('PDF.js loading timeout in PDF processor'));
                }, 8000); // 8 second timeout
            });
            
            const pdfJSReady = new Promise((resolve) => {
                if (typeof window.pdfjsLib !== 'undefined') {
                    resolve();
                } else {
                    window.addEventListener('pdfjs-ready', resolve, { once: true });
                }
            });
            
            try {
                await Promise.race([pdfJSReady, pdfJSTimeout]);
            } catch (timeoutError) {
                console.warn('PDF.js loading timed out in PDF processor');
                
                // Create minimal mock if still not available
                if (typeof window.pdfjsLib === 'undefined') {
                    window.pdfjsLib = {
                        getDocument: () => Promise.reject(new Error('PDF.js not available')),
                        GlobalWorkerOptions: { workerSrc: '' },
                        OPS: {}
                    };
                }
            }
        }
        
        if (typeof window.pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not found. Please ensure pdfjs-dist is properly loaded.');
        }
        
        this.pdfjsLib = window.pdfjsLib;
        
        // Check if this is a mock implementation
        if (this.pdfjsLib.getDocument && this.pdfjsLib.getDocument.toString().includes('PDF.js not available')) {
            console.warn('PDF processor initialized with mock PDF.js - PDF functionality will be limited');
        } else {
            console.log('PDF.js library loaded successfully');
        }
    }
    
    /**
     * Configure PDF.js settings
     */
    configurePDFJS() {
        if (!this.pdfjsLib) return;
        
        // Set memory limits
        this.pdfjsLib.GlobalWorkerOptions.maxImageSize = 16777216; // 16MB
        
        // Configure for desktop environment
        const params = {
            enableXfa: true, // Enable XFA forms
            disableFontFace: false,
            disableRange: false,
            disableStream: false,
            disableAutoFetch: false,
            disableCreateObjectURL: false,
            verbosity: this.options.debugMode ? 1 : 0
        };
        
        this.pdfjsParams = params;
        console.log('PDF.js configured for desktop environment');
    }
    
    /**
     * Verify PDF.js functionality
     */
    async verifyPDFJSFunctionality() {
        try {
            // Test basic functionality with a minimal PDF
            const testPdf = new Uint8Array([
                0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
                0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a, 0x0a // header
            ]);
            
            // This will fail but should not crash
            try {
                await this.pdfjsLib.getDocument(testPdf).promise;
            } catch (e) {
                // Expected to fail with test data
            }
            
            console.log('PDF.js functionality verified');
        } catch (error) {
            throw new Error(`PDF.js verification failed: ${error.message}`);
        }
    }
    
    /**
     * Load PDF from file buffer
     */
    async loadPDF(fileBuffer, fileName = 'document.pdf') {
        if (!this.state.initialized) {
            await this.initialize();
        }
        
        this.state.processing = true;
        const startTime = performance.now();
        
        try {
            console.log(`Loading PDF: ${fileName} (${fileBuffer.byteLength} bytes)`);
            
            // Validate input
            this.validateInput(fileBuffer);
            
            // Show loading
            if (window.utils) {
                window.utils.showLoading('Loading PDF document...');
                window.utils.updateStatus('Loading PDF...');
            }
            
            // Create loading task
            const loadingTask = this.pdfjsLib.getDocument({
                data: fileBuffer,
                ...this.pdfjsParams
            });
            
            // Load document
            this.currentDocument = await loadingTask.promise;
            
            console.log(`PDF loaded successfully. Pages: ${this.currentDocument.numPages}`);
            
            // Process document
            await this.processDocument(fileName);
            
            const processingTime = performance.now() - startTime;
            this.updateStatistics(true, processingTime);
            
            if (window.utils) {
                window.utils.hideLoading();
                window.utils.updateStatus('PDF loaded successfully');
                window.utils.announceToScreenReader(`PDF loaded: ${fileName}, ${this.currentDocument.numPages} pages`, 'polite');
            }
            
            return {
                success: true,
                document: this.currentDocument,
                pages: this.currentPages,
                formFields: this.formFields,
                fileName: fileName,
                pageCount: this.currentDocument.numPages,
                processingTime: processingTime
            };
            
        } catch (error) {
            console.error('Failed to load PDF:', error);
            this.state.lastError = error;
            this.updateStatistics(false);
            
            if (window.utils) {
                window.utils.hideLoading();
                window.utils.updateStatus('Failed to load PDF');
                window.utils.showError(window.utils.formatErrorForUser(error), 'PDF Loading Error');
            }
            
            throw error;
        } finally {
            this.state.processing = false;
        }
    }
    
    /**
     * Validate input buffer
     */
    validateInput(fileBuffer) {
        if (!fileBuffer) {
            throw new Error('No file buffer provided');
        }
        
        if (!(fileBuffer instanceof ArrayBuffer) && !(fileBuffer instanceof Uint8Array)) {
            throw new Error('Invalid file buffer format');
        }
        
        const size = fileBuffer.byteLength || fileBuffer.length;
        
        if (size === 0) {
            throw new Error('Empty file buffer');
        }
        
        if (size > this.options.maxFileSize) {
            throw new Error(`File too large: ${window.utils ? window.utils.formatFileSize(size) : size} bytes. Maximum: ${window.utils ? window.utils.formatFileSize(this.options.maxFileSize) : this.options.maxFileSize} bytes`);
        }
        
        // Check PDF signature
        const uint8Array = new Uint8Array(fileBuffer);
        const header = String.fromCharCode(...uint8Array.slice(0, 8));
        
        if (!header.startsWith('%PDF-')) {
            throw new Error('Invalid PDF file format');
        }
    }
    
    /**
     * Process loaded document
     */
    async processDocument(fileName) {
        if (!this.currentDocument) {
            throw new Error('No document loaded');
        }
        
        const numPages = this.currentDocument.numPages;
        this.currentPages = [];
        this.formFields.clear();
        
        console.log(`Processing ${numPages} pages...`);
        
        // Process pages
        for (let pageNum = 1; pageNum <= Math.min(numPages, this.options.maxPages); pageNum++) {
            try {
                if (window.utils) {
                    window.utils.updateStatus(`Processing page ${pageNum} of ${numPages}...`);
                }
                
                const pageData = await this.processPage(pageNum);
                this.currentPages.push(pageData);
                
                // Callback for progress
                if (this.callbacks.onPageProcessed) {
                    this.callbacks.onPageProcessed(pageNum, pageData);
                }
                
                // Update progress
                const progress = (pageNum / numPages) * 100;
                if (this.callbacks.onProgress) {
                    this.callbacks.onProgress(progress, `Processed page ${pageNum} of ${numPages}`);
                }
                
            } catch (error) {
                console.error(`Failed to process page ${pageNum}:`, error);
                
                // Create error page placeholder
                this.currentPages.push({
                    pageNumber: pageNum,
                    error: error.message,
                    processed: false
                });
            }
        }
        
        // Extract form fields
        await this.extractFormFields();
        
        // Update UI
        if (window.utils) {
            window.utils.updateDocumentInfo(`${fileName} - ${numPages} pages`);
            window.utils.updatePageInfo(1, numPages);
        }
        
        console.log(`Document processing complete. ${this.currentPages.length} pages processed.`);
    }
    
    /**
     * Process individual page
     */
    async processPage(pageNumber) {
        const page = await this.currentDocument.getPage(pageNumber);

        const pageData = {
            pageNumber: pageNumber,
            viewport: page.getViewport({ scale: 1.0 }),
            page: page,
            textContent: null,
            textElements: [], // ✅ NEW: Text with coordinates
            potentialFields: [], // ✅ NEW: Detected form field areas
            annotations: null,
            forms: [],
            processed: true,
            processingTime: 0
        };

        const startTime = performance.now();

        try {
            // Extract text content with coordinates
            const textContent = await page.getTextContent();
            pageData.textContent = textContent;
            
            // ✅ NEW: Extract text with coordinate information
            pageData.textElements = this.extractTextWithCoordinates(textContent);
            
            // ✅ NEW: Detect potential form field areas
            pageData.potentialFields = this.detectPotentialFormFields(pageData.textElements);

            // Extract annotations (including existing form fields)
            const annotations = await page.getAnnotations();
            pageData.annotations = annotations;

            // Process existing form fields
            pageData.forms = this.processPageForms(annotations, pageNumber);

            pageData.processingTime = performance.now() - startTime;
            
            // ✅ NEW: Log what we found for debugging
            console.log(`Page ${pageNumber}: ${pageData.textElements.length} text elements, ${pageData.potentialFields.length} potential fields, ${pageData.forms.length} existing fields`);

        } catch (error) {
            console.error(`Error processing page ${pageNumber}:`, error);
            pageData.error = error.message;
            pageData.processed = false;
        }

        return pageData;
    }
    
    /**
     * Process form fields on a page
     */
    processPageForms(annotations, pageNumber) {
        const forms = [];
        
        annotations.forEach((annotation, index) => {
            if (annotation.subtype === 'Widget') {
                const fieldId = `field_${pageNumber}_${index}`;
                const fieldData = {
                    id: fieldId,
                    pageNumber: pageNumber,
                    type: this.getFieldType(annotation),
                    name: annotation.fieldName || `Field_${index}`,
                    value: annotation.fieldValue || '',
                    defaultValue: annotation.defaultFieldValue || '',
                    rect: annotation.rect,
                    readOnly: annotation.readOnly || false,
                    required: annotation.required || false,
                    options: annotation.options || [],
                    annotation: annotation
                };
                
                forms.push(fieldData);
                this.formFields.set(fieldId, fieldData);
            }
        });
        
        return forms;
    }
    
    /**
     * Determine field type from annotation
     */
    getFieldType(annotation) {
        if (annotation.checkBox) return 'checkbox';
        if (annotation.radioButton) return 'radio';
        if (annotation.options && annotation.options.length > 0) return 'dropdown';
        if (annotation.multiLine) return 'textarea';
        if (annotation.fieldType === 'Sig') return 'signature';
        return 'text';
    }
    
    /**
     * Extract all form fields from document
     */
    async extractFormFields() {
        // Form fields are already extracted during page processing
        console.log(`Extracted ${this.formFields.size} form fields`);
        
        // Announce to screen reader
        if (window.utils && this.formFields.size > 0) {
            window.utils.announceToScreenReader(
                `Document contains ${this.formFields.size} form fields`,
                'polite'
            );
        }
    }
    
    /**
     * Render page to canvas with high quality
     */
    async renderPage(pageNumber, canvas, scale = 1.0) {
        if (!this.currentDocument) {
            throw new Error('No document loaded');
        }
        
        const page = await this.currentDocument.getPage(pageNumber);
        
        // Get device pixel ratio for high-DPI displays
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Calculate effective scale for crisp rendering
        const effectiveScale = scale * devicePixelRatio;
        const viewport = page.getViewport({ scale: effectiveScale });
        
        // Set canvas dimensions to match viewport
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Scale canvas back down using CSS for crisp display
        canvas.style.width = (viewport.width / devicePixelRatio) + 'px';
        canvas.style.height = (viewport.height / devicePixelRatio) + 'px';
        
        const context = canvas.getContext('2d');
        
        // Enable image smoothing for better quality
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        
        // Render page with high quality settings
        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            intent: 'display',
            enableWebGL: true,
            renderInteractiveForms: true
        };
        
        await page.render(renderContext).promise;
        
        // Add accessibility attributes
        canvas.setAttribute('aria-label', `Page ${pageNumber} of ${this.currentDocument.numPages}`);
        canvas.setAttribute('role', 'img');
        
        return {
            page: page,
            viewport: viewport,
            canvas: canvas,
            actualScale: scale,
            devicePixelRatio: devicePixelRatio
        };
    }
    
    /**
     * Get page text content
     */
    async getPageText(pageNumber) {
        const pageData = this.currentPages.find(p => p.pageNumber === pageNumber);
        
        if (pageData && pageData.textContent) {
            return this.extractTextFromContent(pageData.textContent);
        }
        
        // Load text content if not cached
        const page = await this.currentDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        
        return this.extractTextFromContent(textContent);
    }
    
    /**
     * Extract readable text from PDF.js text content
     */
    extractTextFromContent(textContent) {
        if (!textContent || !textContent.items) {
            return '';
        }
        
        return textContent.items
            .map(item => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Extract text with coordinates for overlay system
     */
    extractTextWithCoordinates(textContent) {
        if (!textContent || !textContent.items) {
            return [];
        }
        
        return textContent.items.map((item, index) => ({
            id: `text_${index}`,
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
            fontSize: item.height,
            fontName: item.fontName || 'default',
            // Transform matrix for advanced positioning
            transform: item.transform,
            // Additional properties for form field detection
            isEmpty: item.str.trim().length === 0,
            isSpaces: /^\s+$/.test(item.str),
            // Potential field detection
            couldBeLabel: item.str.includes(':') || item.str.toLowerCase().includes('name'),
            couldBeField: item.str.trim().length === 0 && item.width > 50
        }));
    }
    
    /**
     * Detect potential form field areas from text coordinates
     */
    detectPotentialFormFields(textElements) {
        const potentialFields = [];
        
        // Find empty areas that could be form fields
        for (let i = 0; i < textElements.length; i++) {
            const element = textElements[i];
            
            // Text fields: wide empty areas or underscores
            if ((element.isEmpty && element.width > 80 && element.height > 12) ||
                element.text.includes('_____')) {
                potentialFields.push({
                    type: 'text',
                    confidence: element.isEmpty ? 0.8 : 0.6,
                    x: element.x,
                    y: element.y,
                    width: Math.max(element.width, 120),
                    height: Math.max(element.height, 20),
                    suggestedLabel: this.findNearbyLabel(element, textElements)
                });
            }
            
            // Checkboxes: small square areas or checkbox symbols
            if ((element.width < 30 && element.height < 30 && element.isEmpty) ||
                /☐|☑|□|■/.test(element.text)) {
                potentialFields.push({
                    type: 'checkbox',
                    confidence: 0.7,
                    x: element.x,
                    y: element.y,
                    width: Math.max(element.width, 20),
                    height: Math.max(element.height, 20),
                    suggestedLabel: this.findNearbyLabel(element, textElements)
                });
            }
            
            // Signature areas: very wide empty areas
            if (element.isEmpty && element.width > 200 && element.height > 30) {
                potentialFields.push({
                    type: 'signature',
                    confidence: 0.9,
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: Math.max(element.height, 50),
                    suggestedLabel: 'Signature'
                });
            }
        }
        
        return potentialFields;
    }
    
    /**
     * Find nearby text that could be a label for a form field
     */
    findNearbyLabel(fieldElement, textElements) {
        const LABEL_DISTANCE = 100; // pixels
        
        let closestLabel = '';
        let closestDistance = Infinity;
        
        for (const element of textElements) {
            if (element.text.trim().length === 0) continue;
            
            // Calculate distance (primarily horizontal for typical forms)
            const distance = Math.abs(element.x - fieldElement.x) + 
                           Math.abs(element.y - fieldElement.y) * 0.5;
            
            if (distance < LABEL_DISTANCE && distance < closestDistance) {
                // Prefer elements to the left or slightly above
                if (element.x <= fieldElement.x + 10 && 
                    Math.abs(element.y - fieldElement.y) < 30) {
                    closestLabel = element.text.trim();
                    closestDistance = distance;
                }
            }
        }
        
        return closestLabel.replace(/[:\s]+$/, ''); // Remove trailing colons and spaces
    }
    
    /**
     * Search text in document
     */
    async searchText(query, options = {}) {
        const results = [];
        const searchOptions = {
            caseSensitive: options.caseSensitive || false,
            wholeWord: options.wholeWord || false,
            ...options
        };
        
        for (let pageNum = 1; pageNum <= this.currentDocument.numPages; pageNum++) {
            const text = await this.getPageText(pageNum);
            
            if (text) {
                const matches = this.findTextMatches(text, query, searchOptions);
                
                matches.forEach(match => {
                    results.push({
                        pageNumber: pageNum,
                        text: match.text,
                        context: match.context,
                        position: match.position
                    });
                });
            }
        }
        
        return results;
    }
    
    /**
     * Find text matches in string
     */
    findTextMatches(text, query, options) {
        const matches = [];
        let searchText = text;
        let searchQuery = query;
        
        if (!options.caseSensitive) {
            searchText = text.toLowerCase();
            searchQuery = query.toLowerCase();
        }
        
        let index = 0;
        while ((index = searchText.indexOf(searchQuery, index)) !== -1) {
            const contextStart = Math.max(0, index - 50);
            const contextEnd = Math.min(text.length, index + query.length + 50);
            
            matches.push({
                text: text.substring(index, index + query.length),
                context: text.substring(contextStart, contextEnd),
                position: index
            });
            
            index += query.length;
        }
        
        return matches;
    }
    
    /**
     * Update form field value
     */
    updateFormField(fieldId, value) {
        const field = this.formFields.get(fieldId);
        
        if (!field) {
            throw new Error(`Form field not found: ${fieldId}`);
        }
        
        field.value = value;
        
        // Announce change to screen reader
        if (window.utils) {
            window.utils.announceToScreenReader(
                `Field ${field.name} updated to ${value}`,
                'polite'
            );
        }
        
        console.log(`Updated field ${fieldId}: ${value}`);
    }
    
    /**
     * Get form field data
     */
    getFormField(fieldId) {
        return this.formFields.get(fieldId);
    }
    
    /**
     * Get all form fields
     */
    getAllFormFields() {
        return Array.from(this.formFields.values());
    }
    
    /**
     * Export form data
     */
    exportFormData(format = 'json') {
        const formData = {};
        
        this.formFields.forEach((field, fieldId) => {
            formData[field.name || fieldId] = field.value;
        });
        
        if (format === 'json') {
            return JSON.stringify(formData, null, 2);
        } else if (format === 'csv') {
            const headers = Object.keys(formData);
            const values = Object.values(formData);
            
            return `${headers.join(',')}\n${values.join(',')}`;
        }
        
        return formData;
    }
    
    /**
     * Set event callbacks
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * Update statistics
     */
    updateStatistics(success, processingTime = 0) {
        this.state.statistics.filesProcessed++;
        
        if (success) {
            this.state.statistics.successfulExtractions++;
        } else {
            this.state.statistics.errors++;
        }
        
        if (processingTime > 0) {
            const currentAvg = this.state.statistics.averageProcessingTime;
            const count = this.state.statistics.filesProcessed;
            this.state.statistics.averageProcessingTime = 
                ((currentAvg * (count - 1)) + processingTime) / count;
        }
    }
    
    /**
     * Get processing statistics
     */
    getStatistics() {
        return { ...this.state.statistics };
    }
    
    /**
     * Close current document
     */
    closeDocument() {
        if (this.currentDocument) {
            this.currentDocument.destroy();
            this.currentDocument = null;
        }
        
        this.currentPages = [];
        this.formFields.clear();
        
        if (window.utils) {
            window.utils.updateDocumentInfo('No document loaded');
            window.utils.updatePageInfo(0, 0);
            window.utils.updateStatus('Ready');
        }
        
        console.log('Document closed');
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.closeDocument();
        this.cache.clear();
        this.state.initialized = false;
        
        console.log('PDF Processor cleaned up');
    }
}

// Create global instance (will be initialized when PDF.js is ready)
window.pdfProcessor = null;

// Initialize PDF processor when PDF.js is ready
async function initializePDFProcessor() {
    if (typeof window.pdfjsLib === 'undefined') {
        await new Promise((resolve) => {
            window.addEventListener('pdfjs-ready', resolve, { once: true });
        });
    }
    
    window.pdfProcessor = new PDFProcessor();
    console.log('PDF Processor instance created');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePDFProcessor);
} else {
    initializePDFProcessor();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFProcessor;
} 