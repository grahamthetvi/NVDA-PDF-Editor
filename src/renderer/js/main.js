/**
 * Main Application - NVDA PDF Editor
 * Coordinates all components and handles application lifecycle
 */

class NVDAPDFEditor {
    constructor() {
        this.initialized = false;
        this.currentZoom = 1.0;
        this.currentPage = 1;
        this.totalPages = 0;
        this.currentFile = null;
        this.isProcessing = false;
        this.isSaving = false;
        
        // Component references (will be set during initialization)
        this.pdfProcessor = null;
        this.pdfModifier = null;
        this.accessibility = window.accessibility;
        this.utils = window.utils;
        this.accessiblePDFCoordinator = null;
        this.unstructuredTextEditor = null;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        console.log('NVDA PDF Editor initialized');
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing NVDA PDF Editor...');
            
            // Show loading
            this.utils.showLoading('Initializing application...');
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup menu handlers
            this.setupMenuHandlers();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Setup drag and drop
            this.setupDragAndDrop();
            
            // Initialize UI state
            this.initializeUIState();
            
            // Initialize split view
            this.initializeSplitView();
            
            // Hide loading
            this.utils.hideLoading();
            
            this.initialized = true;
            
            // Announce ready state
            this.utils.updateStatus('Application ready');
            this.utils.announceToScreenReader(
                'NVDA PDF Editor is ready. Press Ctrl+O to open a PDF file or use the Open PDF button.',
                'polite'
            );
            
            console.log('NVDA PDF Editor initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.utils.hideLoading();
            this.utils.showError('Failed to initialize application: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Initialize all components
     */
    async initializeComponents() {
        // Wait for PDF processor to be created
        if (!window.pdfProcessor) {
            console.log('Waiting for PDF processor to be ready...');
            await new Promise((resolve) => {
                const checkPDFProcessor = () => {
                    if (window.pdfProcessor) {
                        resolve();
                    } else {
                        setTimeout(checkPDFProcessor, 100);
                    }
                };
                checkPDFProcessor();
            });
        }
        
        // Set PDF processor reference
        this.pdfProcessor = window.pdfProcessor;
        
        // Initialize PDF processor
        if (this.pdfProcessor && !this.pdfProcessor.state.initialized) {
            await this.pdfProcessor.initialize();
        }
        
        // Initialize PDF modifier
        this.pdfModifier = new window.PDFModifier();
        await this.pdfModifier.initialize();
        
        // Initialize Accessible PDF Coordinator
        console.log('🔄 Initializing Accessible PDF Coordinator...');
        
        if (!window.AccessiblePDFCoordinator) {
            const errorMsg = 'AccessiblePDFCoordinator class is not available. This indicates a script loading issue.';
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }
        
        try {
            this.accessiblePDFCoordinator = new window.AccessiblePDFCoordinator(
                this.pdfProcessor,
                this.accessibility
            );
            console.log('✅ AccessiblePDFCoordinator instance created successfully');
            
            await this.accessiblePDFCoordinator.initialize();
            console.log('✅ AccessiblePDFCoordinator initialized successfully');
            
        } catch (coordinatorError) {
            console.error('❌ Failed to initialize AccessiblePDFCoordinator:', coordinatorError);
            console.error('Error details:', {
                message: coordinatorError.message,
                stack: coordinatorError.stack,
                pdfProcessor: !!this.pdfProcessor,
                accessibility: !!this.accessibility
            });
            throw coordinatorError;
        }
        
        // Initialize Unstructured Text Editor
        if (window.UnstructuredTextEditor) {
            this.unstructuredTextEditor = new window.UnstructuredTextEditor(
                this.accessibility,
                this.pdfProcessor,
                document.getElementById('pdf-viewer') || document.body
            );
            console.log('Unstructured Text Editor initialized in main app');
        } else {
            console.warn('UnstructuredTextEditor not available');
        }
        
        // Initialize PDF Editing Integration (replaces individual components)
        if (window.PDFEditingIntegration) {
            this.pdfEditingIntegration = new window.PDFEditingIntegration(
                this.accessibility,
                this.pdfProcessor
            );
            console.log('PDF Editing Integration initialized in main app');
            
            // Setup keyboard navigation for the integration
            this.pdfEditingIntegration.setupKeyboardNavigation();
            
        } else {
            console.warn('PDFEditingIntegration not available');
            
            // Fallback to individual Clean PDF Editor
            if (window.CleanPDFEditor) {
                this.cleanPDFEditor = new window.CleanPDFEditor(
                    this.accessibility,
                    this.pdfProcessor
                );
                console.log('Clean PDF Editor initialized in main app (fallback)');
            } else {
                console.warn('CleanPDFEditor not available');
            }
        }
        
        // Set up PDF processor callbacks
        if (this.pdfProcessor) {
            this.pdfProcessor.setCallbacks({
                onProgress: (progress, message) => {
                    this.handleProcessingProgress(progress, message);
                },
                onPageProcessed: (pageNum, pageData) => {
                    this.handlePageProcessed(pageNum, pageData);
                },
                onComplete: (result) => {
                    this.handleProcessingComplete(result);
                },
                onError: (error) => {
                    this.handleProcessingError(error);
                }
            });
        }
        
        console.log('Components initialized');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // File operations
        this.addEventHandler('#btn-open-pdf', 'click', () => this.openPDF());
        this.addEventHandler('#btn-open-pdf-main', 'click', () => this.openPDF());
        this.addEventHandler('#btn-save-pdf', 'click', () => this.savePDF());
        
        // Zoom controls
        this.addEventHandler('#btn-zoom-in', 'click', () => this.zoomIn());
        this.addEventHandler('#btn-zoom-out', 'click', () => this.zoomOut());
        
        // Tool buttons
        this.addEventHandler('#btn-edit-fields', 'click', () => this.openFieldEditor());
        this.addEventHandler('#btn-add-text-field', 'click', () => this.addFormField('text'));
        this.addEventHandler('#btn-add-checkbox', 'click', () => this.addFormField('checkbox'));
        this.addEventHandler('#btn-add-dropdown', 'click', () => this.addFormField('dropdown'));
        this.addEventHandler('#btn-add-signature', 'click', () => this.addFormField('signature'));
        
        // Accessibility controls
        this.addEventHandler('#btn-high-contrast', 'click', () => this.toggleHighContrast());
        this.addEventHandler('#btn-focus-indicators', 'click', () => this.toggleFocusIndicators());
        this.addEventHandler('#btn-screen-reader-mode', 'click', () => this.toggleScreenReaderMode());
        this.addEventHandler('#btn-accessibility-help', 'click', () => this.showAccessibilityHelp());
        
        // Page navigation
        this.addEventHandler('#btn-prev-page', 'click', () => this.previousPage());
        this.addEventHandler('#btn-next-page', 'click', () => this.nextPage());
        
        // Error dialog
        this.addEventHandler('#btn-close-error', 'click', () => this.utils.hideError());
        this.addEventHandler('#btn-error-ok', 'click', () => this.utils.hideError());
        
        // Test modal
        this.addEventHandler('#btn-close-test', 'click', () => this.hideTestModal());
        this.addEventHandler('#btn-test-ok', 'click', () => this.hideTestModal());
        
        // Properties panel
        this.addEventHandler('#btn-toggle-properties', 'click', () => this.togglePropertiesPanel());
        
        // Window events
        window.addEventListener('resize', this.utils.debounce(() => {
            this.handleWindowResize();
        }, 250));
        
        window.addEventListener('beforeunload', (event) => {
            this.handleBeforeUnload(event);
        });
        
        // Listen for save requests from coordinator
        document.addEventListener('pdf-save-requested', () => {
            this.savePDF();
        });
        
        console.log('Event listeners setup complete');
    }
    
    /**
     * Add event handler with automatic cleanup tracking
     */
    addEventHandler(selector, event, handler) {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`Adding event handler: ${selector} -> ${event}`);
            
            // Create a wrapper handler that includes debugging
            const wrappedHandler = (e) => {
                console.log(`Event triggered: ${selector} -> ${event}`);
                try {
                    handler(e);
                } catch (error) {
                    console.error(`Error in event handler for ${selector}:`, error);
                }
            };
            
            element.addEventListener(event, wrappedHandler);
            
            // Track for cleanup
            const key = `${selector}-${event}`;
            this.eventHandlers.set(key, { element, event, handler: wrappedHandler });
        } else {
            console.warn(`Element not found for selector: ${selector}`);
        }
    }
    
    /**
     * Setup menu handlers
     */
    setupMenuHandlers() {
        if (window.electronAPI && window.electronAPI.onMenuAction) {
            window.electronAPI.onMenuAction((event, action) => {
                this.handleMenuAction(action);
            });
        }
    }
    
    /**
     * Handle menu actions from Electron
     */
    handleMenuAction(action) {
        console.log(`Menu action: ${action}`);
        
        switch (action) {
            case 'menu-open-pdf':
                this.openPDF();
                break;
            case 'menu-save-pdf':
                this.savePDF();
                break;
            case 'menu-save-as-pdf':
                this.savePDFAs();
                break;
            case 'menu-export-json':
                this.exportFormData('json');
                break;
            case 'menu-export-csv':
                this.exportFormData('csv');
                break;
            case 'menu-zoom-in':
                this.zoomIn();
                break;
            case 'menu-zoom-out':
                this.zoomOut();
                break;
            case 'menu-zoom-reset':
                this.resetZoom();
                break;
            case 'menu-toggle-high-contrast':
                this.toggleHighContrast();
                break;
            case 'menu-toggle-focus-indicators':
                this.toggleFocusIndicators();
                break;
            case 'menu-add-text-field':
                this.addFormField('text');
                break;
            case 'menu-add-checkbox':
                this.addFormField('checkbox');
                break;
            case 'menu-add-dropdown':
                this.addFormField('dropdown');
                break;
            case 'menu-add-signature-field':
                this.addFormField('signature');
                break;
            case 'menu-run-ocr':
                this.runOCR();
                break;
            case 'menu-analyze-structure':
                this.analyzeStructure();
                break;
            case 'menu-screen-reader-help':
                this.showScreenReaderHelp();
                break;
            case 'menu-keyboard-shortcuts':
                this.showKeyboardShortcuts();
                break;
            case 'menu-accessibility-settings':
                this.showAccessibilitySettings();
                break;
            case 'menu-announce-focus':
                this.announceCurrentFocus();
                break;
            case 'menu-read-structure':
                this.readDocumentStructure();
                break;
            case 'menu-user-guide':
                this.showUserGuide();
                break;
            case 'menu-accessibility-guide':
                this.showAccessibilityGuide();
                break;
            default:
                console.warn(`Unknown menu action: ${action}`);
        }
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Let accessibility manager handle global shortcuts first
            const handled = this.handleApplicationShortcuts(event);
            
            if (!handled) {
                // Handle application-specific shortcuts
                this.handleKeyboardShortcut(event);
            }
        });
    }
    
    /**
     * Handle application-specific keyboard shortcuts
     */
    handleApplicationShortcuts(event) {
        const { key, ctrlKey, shiftKey, altKey } = event;
        
        // File operations
        if (ctrlKey && key === 'o') {
            event.preventDefault();
            this.openPDF();
            return true;
        }
        
        if (ctrlKey && key === 's') {
            event.preventDefault();
            if (shiftKey) {
                this.savePDFAs();
            } else {
                this.savePDF();
            }
            return true;
        }
        
        // Zoom controls
        if (ctrlKey && (key === '+' || key === '=')) {
            event.preventDefault();
            this.zoomIn();
            return true;
        }
        
        // Edit Fields shortcut
        if (ctrlKey && key === 'e') {
            event.preventDefault();
            this.openFieldEditor();
            return true;
        }
        
        // Reading Order shortcut
        if (ctrlKey && key === 'r') {
            event.preventDefault();
            if (this.pdfEditingIntegration) {
                this.pdfEditingIntegration.announceReadingOrder();
            }
            return true;
        }
        
        if (ctrlKey && key === '-') {
            event.preventDefault();
            this.zoomOut();
            return true;
        }
        
        if (ctrlKey && key === '0') {
            event.preventDefault();
            this.resetZoom();
            return true;
        }
        
        // Tool shortcuts
        if (ctrlKey && shiftKey) {
            switch (key) {
                case 'T':
                    event.preventDefault();
                    this.addFormField('text');
                    return true;
                case 'C':
                    event.preventDefault();
                    this.addFormField('checkbox');
                    return true;
                case 'D':
                    event.preventDefault();
                    this.addFormField('dropdown');
                    return true;
                case 'S':
                    event.preventDefault();
                    this.addFormField('signature');
                    return true;
                case 'O':
                    event.preventDefault();
                    this.runOCR();
                    return true;
                case 'A':
                    event.preventDefault();
                    this.analyzeStructure();
                    return true;
                case 'E':
                    event.preventDefault();
                    this.toggleUnstructuredTextEditing();
                    return true;
                case 'U':
                    event.preventDefault();
                    this.testUnstructuredTextEditor();
                    return true;
            }
        }
        
        // Page navigation shortcuts
        if (key === 'PageUp' && !shiftKey && !altKey) {
            event.preventDefault();
            this.previousPage();
            return true;
        }
        
        if (key === 'PageDown' && !shiftKey && !altKey) {
            event.preventDefault();
            this.nextPage();
            return true;
        }
        
        // Home and End for first/last page
        if (key === 'Home' && ctrlKey && !shiftKey && !altKey) {
            event.preventDefault();
            this.goToPage(1);
            return true;
        }
        
        if (key === 'End' && ctrlKey && !shiftKey && !altKey) {
            event.preventDefault();
            this.goToPage(this.totalPages);
            return true;
        }
        
        // Escape key handling
        if (key === 'Escape') {
            event.preventDefault();
            
            // Exit edit mode if active
            if (window.overlayManager && window.overlayManager.isEditMode) {
                this.exitEditMode();
                return true;
            }
            
            // Close any open dialogs
            this.accessibility.handleEscapeKey();
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(event) {
        // Additional application shortcuts can be added here
    }
    
    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const dropZone = document.querySelector('.pdf-viewer');
        
        if (!dropZone) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Highlight drop zone
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });
        
        // Handle dropped files
        dropZone.addEventListener('drop', async (e) => {
            const files = Array.from(e.dataTransfer.files);
            
            if (files.length > 0) {
                const file = files[0];
                
                if (file.type === 'application/pdf') {
                    await this.loadPDFFile(file);
                } else {
                    this.utils.showError('Please drop a PDF file.');
                    this.utils.announceToScreenReader('Invalid file type. Please drop a PDF file.', 'assertive');
                }
            }
        });
        
        console.log('Drag and drop setup complete');
    }
    
    /**
     * Initialize UI state
     */
    initializeUIState() {
        // Disable tools until PDF is loaded
        this.setToolsEnabled(false);
        
        // Set initial zoom
        this.utils.updateZoomInfo(this.currentZoom);
        
        // Initialize accessibility states
        const highContrastBtn = document.querySelector('#btn-high-contrast');
        const focusIndicatorsBtn = document.querySelector('#btn-focus-indicators');
        const screenReaderBtn = document.querySelector('#btn-screen-reader-mode');
        
        if (highContrastBtn) {
            highContrastBtn.setAttribute('aria-pressed', 'false');
        }
        
        if (focusIndicatorsBtn) {
            focusIndicatorsBtn.setAttribute('aria-pressed', 'true');
        }
        
        if (screenReaderBtn) {
            screenReaderBtn.setAttribute('aria-pressed', 'false');
        }
        
        console.log('UI state initialized');
    }
    
    /**
     * Open PDF file
     */
    async openPDF() {
        console.log('openPDF method called');
        
        if (this.isProcessing) {
            this.utils.announceToScreenReader('Please wait for current operation to complete', 'assertive');
            return;
        }
        
        try {
            console.log('Checking for electronAPI...');
            console.log('electronAPI available:', !!window.electronAPI);
            console.log('openPDFDialog available:', !!(window.electronAPI && window.electronAPI.openPDFDialog));
            
            if (window.electronAPI && window.electronAPI.openPDFDialog) {
                console.log('Using Electron file dialog...');
                const result = await window.electronAPI.openPDFDialog();
                console.log('Dialog result:', result);
                
                if (result.success && result.buffer) {
                    // ✅ FIXED: Handle transferable array format from IPC
                    try {
                        console.log('Received buffer size:', result.buffer.length);
                        console.log('Received buffer type:', result.buffer.constructor.name);
                        
                        // Convert the transferable array to Uint8Array
                        const pdfBuffer = new Uint8Array(result.buffer);
                        
                        console.log('Buffer converted to Uint8Array:', pdfBuffer.length, 'bytes');
                        
                        await this.loadPDFFromBuffer(pdfBuffer, result.fileName);
                    } catch (bufferError) {
                        console.error('Failed to process PDF buffer:', bufferError);
                        this.utils.showError('Failed to process PDF buffer: ' + bufferError.message);
                    }
                } else if (result.error) {
                    this.utils.showError('Failed to open file: ' + result.error);
                } else if (result.cancelled) {
                    console.log('User cancelled file dialog');
                    this.utils.announceToScreenReader('File dialog cancelled', 'polite');
                }
            } else {
                console.log('Using fallback file input...');
                // Fallback for web environment
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,application/pdf';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await this.loadPDFFile(file);
                    }
                };
                input.click();
            }
        } catch (error) {
            console.error('Failed to open PDF:', error);
            this.utils.showError('Failed to open PDF: ' + error.message);
        }
    }
    
    /**
     * Load PDF from file object
     */
    async loadPDFFile(file) {
        try {
            // Validate file
            this.utils.validateFileType(file, ['application/pdf']);
            this.utils.validateFileSize(file);
            
            // Convert to buffer
            const buffer = await this.utils.fileToArrayBuffer(file);
            
            // Load PDF
            await this.loadPDFFromBuffer(buffer, file.name);
            
        } catch (error) {
            console.error('Failed to load PDF file:', error);
            this.utils.showError('Failed to load PDF: ' + error.message);
        }
    }
    
    /**
     * Load PDF from buffer
     */
    async loadPDFFromBuffer(buffer, fileName) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            // Close current document
            if (this.pdfProcessor.currentDocument) {
                this.pdfProcessor.closeDocument();
            }
            
            // ✅ FIXED: Clone buffer BEFORE passing to PDF processor to prevent detachment
            let processingBuffer;
            let storageBuffer;
            
            try {
                if (buffer instanceof Uint8Array) {
                    // Clone the buffer for processing and storage
                    processingBuffer = new Uint8Array(buffer);
                    storageBuffer = new Uint8Array(buffer);
                } else if (buffer instanceof ArrayBuffer) {
                    // Convert and clone
                    processingBuffer = new Uint8Array(buffer);
                    storageBuffer = new Uint8Array(buffer);
                } else if (Array.isArray(buffer)) {
                    // Convert array to Uint8Array and clone
                    processingBuffer = new Uint8Array(buffer);
                    storageBuffer = new Uint8Array(buffer);
                } else {
                    // Try to convert and clone
                    processingBuffer = new Uint8Array(buffer);
                    storageBuffer = new Uint8Array(buffer);
                }
                
                console.log(`Processing buffer: ${processingBuffer.constructor.name}, length: ${processingBuffer.length}`);
                console.log(`Storage buffer: ${storageBuffer.constructor.name}, length: ${storageBuffer.length}`);
                
            } catch (bufferError) {
                console.error('Failed to clone buffer:', bufferError);
                throw new Error('Failed to process PDF buffer: ' + bufferError.message);
            }
            
            // Load new document with processing buffer
            const result = await this.pdfProcessor.loadPDF(processingBuffer, fileName);
            
            if (result.success) {
                console.log(`PDF loaded successfully: ${storageBuffer.length} bytes`);
                
                // Use the storage buffer (not the processing buffer which may be detached)
                this.currentFile = {
                    name: fileName,
                    buffer: storageBuffer,
                    size: storageBuffer.length
                };
                
                this.totalPages = result.pageCount;
                this.currentPage = 1;
                
                // Render first page
                await this.renderCurrentPage();
                
                // Process document with accessible PDF coordinator
                if (this.accessiblePDFCoordinator) {
                    try {
                        console.log('Processing document with Accessible PDF Coordinator...');
                        const processingStats = await this.accessiblePDFCoordinator.processDocument();
                        console.log('Document processed successfully:', processingStats);
                        
                        // Process unstructured text elements
                        if (this.unstructuredTextEditor && processingStats.totalElements > 0) {
                            try {
                                console.log('Processing unstructured text elements...');
                                const textElements = await this.pdfProcessor.extractTextWithCoordinates(this.currentPage);
                                const editorsCreated = this.unstructuredTextEditor.processTextElements(textElements);
                                console.log(`Created ${editorsCreated} unstructured text editors`);
                            } catch (textError) {
                                console.warn('Failed to process unstructured text elements:', textError);
                            }
                        }
                    } catch (error) {
                        console.warn('Failed to process document with coordinator:', error);
                        // Continue without coordinator - basic functionality still works
                    }
                }
                
                // Enable tools
                this.setToolsEnabled(true);
                
                // Initialize page navigation
                this.updatePageNavigation();
                
                // Announce success
                this.utils.announceToScreenReader(
                    `PDF loaded successfully: ${fileName}, ${this.totalPages} pages`,
                    'assertive'
                );
                
                // Test unstructured text editor after PDF is loaded
                setTimeout(() => {
                    console.log('🔄 Auto-testing unstructured text editor after PDF load...');
                    testUnstructuredTextEditor();
                }, 2000);
            }
            
        } catch (error) {
            console.error('Failed to load PDF from buffer:', error);
            this.utils.showError('Failed to load PDF: ' + error.message);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Render current page
     */
    async renderCurrentPage() {
        if (!this.pdfProcessor.currentDocument) return;

        try {
            const pdfViewer = document.querySelector('#pdf-viewer');
            const pdfPages = document.querySelector('#pdf-pages');
            const placeholder = document.querySelector('.pdf-placeholder');

            if (!pdfViewer || !pdfPages) return;

            // Hide placeholder, show pages
            if (placeholder) placeholder.style.display = 'none';
            pdfPages.style.display = 'block';

            // Clear existing content
            pdfPages.innerHTML = '';

            // Create canvas for current page
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', `Page ${this.currentPage} of ${this.totalPages}`);

            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page';
            pageContainer.appendChild(canvas);

            pdfPages.appendChild(pageContainer);

            // Render page
            await this.pdfProcessor.renderPage(this.currentPage, canvas, this.currentZoom);

            // ✅ NEW: Update overlay manager for page/zoom changes
            if (window.overlayManager) {
                window.overlayManager.updateOverlay(this.currentPage, this.currentZoom);
            }
            
            // Update accessible PDF coordinator overlays
            if (this.accessiblePDFCoordinator) {
                this.accessiblePDFCoordinator.updateOverlays(this.currentPage, this.currentZoom);
            }

            // Update UI
            this.utils.updatePageInfo(this.currentPage, this.totalPages);

            console.log(`Rendered page ${this.currentPage} at ${Math.round(this.currentZoom * 100)}% zoom`);

        } catch (error) {
            console.error('Failed to render page:', error);
            this.utils.showError('Failed to render page: ' + error.message);
        }
    }
    
    /**
     * Save PDF with form fields
     */
    async savePDF() {
        if (!this.currentFile) {
            this.utils.showError('No PDF file is currently open');
            return;
        }
        
        // Prevent multiple save dialogs
        if (this.isSaving) {
            console.log('Save already in progress, ignoring duplicate request');
            return;
        }
        
        this.isSaving = true;
        
        try {
            this.utils.showLoading('Saving PDF modifications...');
            
            let finalPdfBuffer = this.currentFile.buffer;
            let modificationsCount = 0;
            
            // Get modifications from all systems
            if (this.accessiblePDFCoordinator) {
                console.log('Saving with AccessiblePDFCoordinator...');
                finalPdfBuffer = await this.accessiblePDFCoordinator.saveModifications(finalPdfBuffer);
                const overlayData = this.accessiblePDFCoordinator.getOverlayData();
                modificationsCount = overlayData.filter(item => item.modified).length;
            }
            
            // Save via IPC
            if (window.electronAPI && window.electronAPI.savePDFDialog) {
                console.log('Initiating save dialog...');
                
                // Convert buffer for IPC transfer
                const transferableBuffer = finalPdfBuffer instanceof ArrayBuffer 
                    ? Array.from(new Uint8Array(finalPdfBuffer))
                    : Array.from(finalPdfBuffer);
                    
                const result = await window.electronAPI.savePDFDialog(
                    transferableBuffer,
                    this.currentFile.name
                );
                
                this.utils.hideLoading();
                
                if (result.success) {
                    const message = modificationsCount > 0 
                        ? `PDF saved with ${modificationsCount} modifications to ${result.filePath}`
                        : `PDF saved to ${result.filePath}`;
                        
                    this.utils.announceToScreenReader(message, 'assertive');
                    this.utils.updateStatus('PDF saved successfully');
                    
                    // Update current file info
                    this.currentFile.buffer = finalPdfBuffer;
                    this.markAsSaved();
                    
                } else if (result.error) {
                    this.utils.showError('Failed to save PDF: ' + result.error);
                } else if (result.cancelled) {
                    console.log('Save operation cancelled by user');
                    this.utils.updateStatus('Save cancelled');
                }
            } else {
                this.utils.hideLoading();
                this.utils.showError('Save functionality not available');
            }
            
        } catch (error) {
            this.utils.hideLoading();
            console.error('PDF save failed:', error);
            this.utils.showError('Failed to save PDF: ' + error.message);
        } finally {
            // Reset saving flag
            this.isSaving = false;
        }
    }
    
    /**
     * Save PDF with new name
     */
    async savePDFAs() {
        await this.savePDF(); // For now, same as save
    }

    /**
     * Mark document as saved (clear dirty flag)
     */
    markAsSaved() {
        // Clear modification indicators
        document.querySelectorAll('.modified').forEach(element => {
            element.classList.remove('modified');
            
            // Update visual styling to show saved state
            if (element.style.borderColor === '#28a745' || element.style.borderColor === 'rgb(40, 167, 69)') {
                element.style.borderColor = '#007acc'; // Back to normal
            }
        });
        
        // Update window title to remove unsaved indicator
        if (document.title.includes('*')) {
            document.title = document.title.replace(' *', '');
        }
        
        // Announce save completion
        this.utils.announceToScreenReader('All changes saved successfully', 'polite');
    }

    /**
     * Check if document has unsaved changes
     */
    hasUnsavedChanges() {
        let hasChanges = false;
        
        // Check accessible PDF coordinator
        if (this.accessiblePDFCoordinator) {
            const overlayData = this.accessiblePDFCoordinator.getOverlayData();
            hasChanges = hasChanges || overlayData.some(item => item.modified);
        }
        
        // Check unstructured text editor
        if (this.unstructuredTextEditor) {
            const textModifications = this.unstructuredTextEditor.getAllTextModifications();
            hasChanges = hasChanges || textModifications.length > 0;
        }
        
        // Fallback: check for modified elements in DOM
        if (!hasChanges) {
            hasChanges = document.querySelectorAll('.modified').length > 0;
        }
        
        return hasChanges;
    }

    /**
     * Auto-save functionality - REMOVED
     */
    /*
    async performAutoSave() {
        // Auto-save functionality removed
    }
    */

    /**
     * Restore from auto-save backup if needed
     */
    restoreAutoSaveBackup() {
        if (this.autoSaveBackup && this.autoSaveBackup.buffer) {
            console.log('Restoring from auto-save backup...');
            this.currentFile.buffer = this.autoSaveBackup.buffer;
            
            this.utils.announceToScreenReader(
                `Restored ${this.autoSaveBackup.modifications} auto-saved changes`,
                'assertive'
            );
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Export form data
     */
    async exportFormData(format) {
        if (!this.pdfProcessor.currentDocument) {
            this.utils.showError('No PDF file is currently open');
            return;
        }
        
        try {
            const data = this.pdfProcessor.exportFormData(format);
            const filename = `${this.currentFile.name.replace('.pdf', '')}_form_data`;
            
            if (window.electronAPI && window.electronAPI.exportDataDialog) {
                const result = await window.electronAPI.exportDataDialog(
                    data,
                    filename,
                    format
                );
                
                if (result.success) {
                    this.utils.announceToScreenReader(`Form data exported to ${result.filePath}`, 'assertive');
                    this.utils.updateStatus('Form data exported successfully');
                } else if (result.error) {
                    this.utils.showError('Failed to export data: ' + result.error);
                }
            }
        } catch (error) {
            console.error('Failed to export form data:', error);
            this.utils.showError('Failed to export form data: ' + error.message);
        }
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        this.currentZoom = Math.min(this.currentZoom * 1.25, 5.0);
        this.utils.updateZoomInfo(this.currentZoom);
        this.renderCurrentPage();
        
        // Update overlay manager with new zoom
        if (window.overlayManager) {
            window.overlayManager.updateOverlay(this.currentPage, this.currentZoom);
        }
        
        this.utils.announceToScreenReader(`Zoomed in to ${Math.round(this.currentZoom * 100)}%`, 'polite');
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        this.currentZoom = Math.max(this.currentZoom / 1.25, 0.25);
        this.utils.updateZoomInfo(this.currentZoom);
        this.renderCurrentPage();
        
        // Update overlay manager with new zoom
        if (window.overlayManager) {
            window.overlayManager.updateOverlay(this.currentPage, this.currentZoom);
        }
        
        this.utils.announceToScreenReader(`Zoomed out to ${Math.round(this.currentZoom * 100)}%`, 'polite');
    }
    
    /**
     * Reset zoom
     */
    resetZoom() {
        this.currentZoom = 1.0;
        this.utils.updateZoomInfo(this.currentZoom);
        this.renderCurrentPage();
        
        // Update overlay manager with new zoom
        if (window.overlayManager) {
            window.overlayManager.updateOverlay(this.currentPage, this.currentZoom);
        }
        
        this.utils.announceToScreenReader('Zoom reset to 100%', 'polite');
    }
    
    /**
     * Go to previous page
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderCurrentPage();
            this.updatePageNavigation();
            
            // Update overlay manager with new page
            if (window.overlayManager) {
                window.overlayManager.updateOverlay(this.currentPage, this.currentZoom);
            }
            
            // Update split view overlay panel
            const overlayPanel = document.getElementById('overlay-viewer-panel');
            if (overlayPanel && overlayPanel.style.display !== 'none') {
                this.updateOverlayView();
            }
            
            this.utils.announceToScreenReader(`Page ${this.currentPage} of ${this.totalPages}`, 'polite');
        }
    }
    
    /**
     * Go to next page
     */
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.renderCurrentPage();
            this.updatePageNavigation();
            
            // Update overlay manager with new page
            if (window.overlayManager) {
                window.overlayManager.updateOverlay(this.currentPage, this.currentZoom);
            }
            
            // Update split view overlay panel
            const overlayPanel = document.getElementById('overlay-viewer-panel');
            if (overlayPanel && overlayPanel.style.display !== 'none') {
                this.updateOverlayView();
            }
            
            this.utils.announceToScreenReader(`Page ${this.currentPage} of ${this.totalPages}`, 'polite');
        }
    }
    
    /**
     * Go to specific page
     */
    goToPage(pageNumber) {
        if (pageNumber >= 1 && pageNumber <= this.totalPages && pageNumber !== this.currentPage) {
            this.currentPage = pageNumber;
            this.renderCurrentPage();
            this.updatePageNavigation();
            
            // Update overlay manager with new page
            if (window.overlayManager) {
                window.overlayManager.updateOverlay(this.currentPage, this.currentZoom);
            }
            
            // Update split view overlay panel
            const overlayPanel = document.getElementById('overlay-viewer-panel');
            if (overlayPanel && overlayPanel.style.display !== 'none') {
                this.updateOverlayView();
            }
            
            this.utils.announceToScreenReader(`Page ${this.currentPage} of ${this.totalPages}`, 'polite');
        }
    }
    
    /**
     * Update page navigation UI
     */
    updatePageNavigation() {
        const pageNavigation = document.querySelector('.page-navigation');
        const prevButton = document.getElementById('btn-prev-page');
        const nextButton = document.getElementById('btn-next-page');
        const currentPageDisplay = document.getElementById('current-page');
        const totalPagesDisplay = document.getElementById('total-pages');
        
        if (this.totalPages > 0) {
            // Always show navigation when PDF is loaded
            if (pageNavigation) pageNavigation.style.display = 'flex';
            
            // Update page display
            if (currentPageDisplay) currentPageDisplay.textContent = this.currentPage;
            if (totalPagesDisplay) totalPagesDisplay.textContent = this.totalPages;
            
            // Update button states
            if (prevButton) {
                prevButton.disabled = this.currentPage === 1;
            }
            
            if (nextButton) {
                nextButton.disabled = this.currentPage >= this.totalPages;
            }
        } else {
            // Hide navigation when no PDF loaded
            if (pageNavigation) pageNavigation.style.display = 'none';
        }
        
        // Also update status bar page info
        const pageInfo = document.getElementById('page-info');
        if (pageInfo && this.totalPages > 0) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }
    }
    
    /**
     * Add form field using overlay system
     */
    addFormField(type) {
        if (!this.pdfProcessor.currentDocument) {
            this.utils.showError('Please open a PDF file first');
            return;
        }
        
        // Check if overlay manager is available
        if (!window.overlayManager) {
            this.utils.showError('Overlay system not ready. Please try again.');
            return;
        }
        
        // Enable edit mode in overlay manager
        window.overlayManager.enableEditMode(type);
        
        // Update UI to show edit mode
        this.setEditModeUI(true, type);
        
        this.utils.announceToScreenReader(`Adding ${type} field - click on the document to place it`, 'assertive');
        this.utils.updateStatus(`Click on the document to add a ${type} field`);
        
        console.log(`Edit mode enabled for ${type} field creation`);
    }
    
    /**
     * Update UI for edit mode
     */
    setEditModeUI(isEditMode, fieldType = null) {
        // Update tool buttons to show active state
        const toolButtons = [
            '#btn-add-text-field',
            '#btn-add-checkbox', 
            '#btn-add-dropdown',
            '#btn-add-signature'
        ];
        
        toolButtons.forEach(selector => {
            const button = document.querySelector(selector);
            if (button) {
                if (isEditMode && selector === `#btn-add-${fieldType}-field`) {
                    button.classList.add('active');
                    button.setAttribute('aria-pressed', 'true');
                } else {
                    button.classList.remove('active');
                    button.setAttribute('aria-pressed', 'false');
                }
            }
        });
        
        // Update cursor for PDF viewer
        const pdfViewer = document.querySelector('#pdf-viewer');
        if (pdfViewer) {
            if (isEditMode) {
                pdfViewer.style.cursor = 'crosshair';
                pdfViewer.setAttribute('aria-label', `PDF content - Click to add ${fieldType} field`);
            } else {
                pdfViewer.style.cursor = 'default';
                pdfViewer.setAttribute('aria-label', 'PDF content');
            }
        }
    }
    
    /**
     * Exit edit mode
     */
    exitEditMode() {
        if (window.overlayManager) {
            window.overlayManager.disableEditMode();
        }
        
        this.setEditModeUI(false);
        this.utils.updateStatus('Ready');
        
        this.utils.announceToScreenReader('Edit mode disabled', 'polite');
    }
    
    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        if (this.accessibility) {
            this.accessibility.toggleHighContrastMode();
            
            const button = document.querySelector('#btn-high-contrast');
            if (button) {
                const pressed = this.accessibility.highContrastMode;
                button.setAttribute('aria-pressed', pressed.toString());
            }
        }
    }
    
    /**
     * Toggle focus indicators
     */
    toggleFocusIndicators() {
        if (this.accessibility) {
            this.accessibility.toggleEnhancedFocusMode();
            
            const button = document.querySelector('#btn-focus-indicators');
            if (button) {
                const pressed = this.accessibility.enhancedFocusMode;
                button.setAttribute('aria-pressed', pressed.toString());
            }
        }
    }
    
    /**
     * Toggle screen reader mode
     */
    toggleScreenReaderMode() {
        if (this.accessibility) {
            this.accessibility.screenReaderMode = !this.accessibility.screenReaderMode;
            
            const button = document.querySelector('#btn-screen-reader-mode');
            if (button) {
                button.setAttribute('aria-pressed', this.accessibility.screenReaderMode.toString());
            }
            
            this.utils.announceToScreenReader(
                `Screen reader mode ${this.accessibility.screenReaderMode ? 'enabled' : 'disabled'}`,
                'assertive'
            );
        }
    }
    
    /**
     * Set tools enabled/disabled
     */
    setToolsEnabled(enabled) {
        const toolButtons = [
            '#btn-save-pdf',
            '#btn-add-text-field',
            '#btn-add-checkbox',
            '#btn-add-dropdown',
            '#btn-add-signature'
        ];
        
        toolButtons.forEach(selector => {
            const button = document.querySelector(selector);
            if (button) {
                button.disabled = !enabled;
            }
        });
    }
    
    /**
     * Show accessibility help
     */
    showAccessibilityHelp() {
        console.log('showAccessibilityHelp called');
        
        // Show test modal first to verify modal system works
        this.showTestModal();
    }
    
    /**
     * Show test modal
     */
    showTestModal() {
        console.log('showTestModal called');
        
        const modal = document.getElementById('test-modal');
        console.log('Test modal element found:', !!modal);
        
        if (modal) {
            modal.style.display = 'block';
            modal.style.zIndex = '1055';
            modal.setAttribute('aria-hidden', 'false');
            
            console.log('Test modal display set to:', modal.style.display);
            console.log('Test modal z-index set to:', modal.style.zIndex);
            
            // Focus the OK button
            const okButton = modal.querySelector('#btn-test-ok');
            if (okButton) {
                okButton.focus();
                console.log('Focus set to test modal OK button');
            }
            
            this.utils.announceToScreenReader('Test modal opened', 'assertive');
        } else {
            console.error('Test modal element not found');
        }
    }
    
    /**
     * Hide test modal
     */
    hideTestModal() {
        console.log('hideTestModal called');
        
        const modal = document.getElementById('test-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            
            this.utils.announceToScreenReader('Test modal closed', 'polite');
        }
    }
    
    /**
     * Show screen reader help
     */
    showScreenReaderHelp() {
        this.utils.announceToScreenReader(
            'AccessiblePDF Editor supports NVDA, JAWS, and Narrator. Use Tab to navigate, Enter to activate buttons, and arrow keys to navigate content. Press F1 for keyboard shortcuts.',
            'assertive'
        );
    }
    
    /**
     * Show keyboard shortcuts
     */
    showKeyboardShortcuts() {
        if (this.accessibility) {
            this.accessibility.showKeyboardShortcuts();
        }
    }
    
    /**
     * Show accessibility settings (placeholder)
     */
    showAccessibilitySettings() {
        this.utils.announceToScreenReader('Accessibility settings dialog would open here', 'assertive');
    }
    
    /**
     * Announce current focus
     */
    announceCurrentFocus() {
        if (this.accessibility) {
            this.accessibility.announceCurrentFocus();
        }
    }
    
    /**
     * Read document structure
     */
    readDocumentStructure() {
        if (this.accessibility) {
            this.accessibility.readDocumentStructure();
        }
    }
    
    /**
     * Show user guide (placeholder)
     */
    showUserGuide() {
        this.utils.announceToScreenReader('User guide would open here', 'assertive');
    }
    
    /**
     * Show accessibility guide (placeholder)
     */
    showAccessibilityGuide() {
        this.utils.announceToScreenReader('Accessibility guide would open here', 'assertive');
    }
    
    /**
     * Run OCR on current page (placeholder)
     */
    runOCR() {
        if (!this.pdfProcessor.currentDocument) {
            this.utils.showError('Please open a PDF file first');
            return;
        }
        
        this.utils.announceToScreenReader('OCR processing would start here', 'assertive');
        console.log('Running OCR...');
    }
    
    /**
     * Analyze document structure (placeholder)
     */
    analyzeStructure() {
        if (!this.pdfProcessor.currentDocument) {
            this.utils.showError('Please open a PDF file first');
            return;
        }
        
        this.utils.announceToScreenReader('Document structure analysis would start here', 'assertive');
        console.log('Analyzing structure...');
    }
    
    /**
     * Toggle properties panel
     */
    togglePropertiesPanel() {
        const panel = document.querySelector('#properties-content');
        const button = document.querySelector('#btn-toggle-properties');
        
        if (panel && button) {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            const newState = !isExpanded;
            
            button.setAttribute('aria-expanded', newState.toString());
            panel.style.display = newState ? 'block' : 'none';
            
            const buttonText = button.querySelector('.btn-text');
            if (buttonText) {
                buttonText.textContent = newState ? '-' : '+';
            }
            
            this.utils.announceToScreenReader(
                `Properties panel ${newState ? 'expanded' : 'collapsed'}`,
                'polite'
            );
        }
    }
    
    /**
     * Open the field editor panel
     */
    openFieldEditor() {
        if (!this.pdfEditingIntegration && !this.cleanPDFEditor) {
            this.utils.showError('Field editor not available');
            return;
        }
        
        if (!this.currentFile) {
            this.utils.showError('Please load a PDF file first');
            this.utils.announceToScreenReader('Please load a PDF file first', 'assertive');
            return;
        }
        
        try {
            if (this.pdfEditingIntegration) {
                // Use the integrated approach
                this.pdfEditingIntegration.cleanEditor.showEditingPanel();
                this.utils.announceToScreenReader('Integrated field editor panel opened', 'polite');
            } else {
                // Fallback to individual clean editor
                this.cleanPDFEditor.showEditingPanel();
                this.utils.announceToScreenReader('Field editor panel opened', 'polite');
            }
        } catch (error) {
            console.error('Failed to open field editor:', error);
            this.utils.showError('Failed to open field editor: ' + error.message);
        }
    }

    /**
     * Toggle unstructured text editing mode
     */
    toggleUnstructuredTextEditing() {
        if (!this.unstructuredTextEditor) {
            this.utils.showError('Unstructured text editor not available');
            return;
        }
        
        if (!this.pdfProcessor.currentDocument) {
            this.utils.showError('Please open a PDF file first');
            return;
        }
        
        try {
            // Toggle the editing mode
            this.unstructuredTextEditor.toggleUnstructuredEditMode();
            
            // Announce the change
            this.utils.announceToScreenReader(
                'Unstructured text editing mode toggled',
                'polite'
            );
            
            console.log('Unstructured text editing mode toggled');
            
        } catch (error) {
            console.error('Failed to toggle unstructured text editing:', error);
            this.utils.showError('Failed to toggle text editing mode: ' + error.message);
        }
    }
    
    /**
     * Test unstructured text editor functionality
     */
    testUnstructuredTextEditor() {
        console.log('🧪 Testing unstructured text editor via shortcut...');
        
        // Call the global test function
        setTimeout(() => {
            testUnstructuredTextEditor();
        }, 100);
    }
    
    /**
     * Handle processing progress
     */
    handleProcessingProgress(progress, message) {
        this.utils.updateStatus(message);
        
        // Update progress if UI element exists
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
    
    /**
     * Handle page processed
     */
    handlePageProcessed(pageNum, pageData) {
        console.log(`Page ${pageNum} processed:`, pageData);
    }
    
    /**
     * Handle processing complete
     */
    handleProcessingComplete(result) {
        console.log('Processing complete:', result);
        this.utils.updateStatus('Processing complete');
        
        // Process elements for field editor
        this.processElementsForFieldEditor(result);
    }
    
    /**
     * Process elements for field editor
     */
    processElementsForFieldEditor(result) {
        if (!this.pdfEditingIntegration && !this.cleanPDFEditor) return;
        
        try {
            let extractedElements = [];
            
            // Extract elements from result
            if (result && result.elements) {
                extractedElements = result.elements;
            } else if (result && result.pages) {
                // Extract from pages
                extractedElements = result.pages.flatMap(page => page.elements || []);
            }
            
            // Process elements through the appropriate editor
            if (this.pdfEditingIntegration) {
                // Use the integrated approach
                this.pdfEditingIntegration.cleanEditor.processElements(extractedElements);
                console.log(`Processed ${extractedElements.length} elements through PDF Editing Integration`);
            } else {
                // Fallback to individual clean editor
                this.cleanPDFEditor.processElements(extractedElements);
                console.log(`Processed ${extractedElements.length} elements for field editor`);
            }
            
        } catch (error) {
            console.error('Failed to process elements for field editor:', error);
        }
    }

    /**
     * Handle processing error
     */
    handleProcessingError(error) {
        console.error('Processing error:', error);
        this.utils.showError('Processing error: ' + error.message);
    }
    
    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Re-render current page to fit new size
        if (this.pdfProcessor.currentDocument) {
            this.renderCurrentPage();
        }
    }
    
    /**
     * Handle before unload
     */
    handleBeforeUnload(event) {
        // Check if there are unsaved changes
        // For now, just log
        console.log('Application closing...');
    }
    
    /**
     * Initialize split view functionality
     */
    initializeSplitView() {
        // Toggle overlay view button
        const toggleOverlayBtn = document.getElementById('btn-toggle-overlay-view');
        const overlayPanel = document.getElementById('overlay-viewer-panel');
        
        if (toggleOverlayBtn && overlayPanel) {
            toggleOverlayBtn.addEventListener('click', () => {
                const isPressed = toggleOverlayBtn.getAttribute('aria-pressed') === 'true';
                const newState = !isPressed;
                
                toggleOverlayBtn.setAttribute('aria-pressed', newState.toString());
                overlayPanel.style.display = newState ? 'flex' : 'none';
                toggleOverlayBtn.querySelector('.btn-text').textContent = newState ? 'Hide Overlays' : 'Show Overlays';
                
                if (newState) {
                    this.updateOverlayView();
                }
            });
        }
        
        // Listen for element selection
        document.addEventListener('element-selected', (event) => {
            this.updatePropertiesPanel(event.detail);
        });
        
        // Listen for overlay focus
        document.addEventListener('focusin', (event) => {
            if (event.target.hasAttribute('data-element-id')) {
                this.selectElement(event.target);
            }
        });
    }

    /**
     * Select an element and update properties
     */
    selectElement(element) {
        // Remove previous selection
        document.querySelectorAll('.element-selected').forEach(el => {
            el.classList.remove('element-selected');
        });
        
        // Add selection to current element
        element.classList.add('element-selected');
        
        // Get element data
        const elementData = {
            id: element.getAttribute('data-element-id'),
            type: element.getAttribute('data-element-type'),
            page: element.closest('.pdf-page')?.getAttribute('data-page-number') || 'Unknown',
            value: this.getElementValue(element),
            modified: element.classList.contains('modified'),
            attributes: this.getElementAttributes(element)
        };
        
        // Update properties panel
        this.updatePropertiesPanel(elementData);
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('element-selected', { detail: elementData }));
    }

    /**
     * Get element value based on type
     */
    getElementValue(element) {
        if (element.tagName === 'INPUT') {
            if (element.type === 'checkbox') {
                return element.checked ? 'Checked' : 'Unchecked';
            }
            return element.value || '(empty)';
        } else if (element.tagName === 'SELECT') {
            const selectedOption = element.options[element.selectedIndex];
            return selectedOption ? selectedOption.text : '(none selected)';
        } else if (element.contentEditable === 'true') {
            return element.textContent || '(empty)';
        } else {
            return element.textContent || element.value || '(empty)';
        }
    }

    /**
     * Get all relevant attributes of an element
     */
    getElementAttributes(element) {
        const attributes = {};
        
        // Get position
        const rect = element.getBoundingClientRect();
        const pdfPage = element.closest('.pdf-page');
        if (pdfPage) {
            const pageRect = pdfPage.getBoundingClientRect();
            attributes.position = {
                x: Math.round(rect.left - pageRect.left),
                y: Math.round(rect.top - pageRect.top)
            };
        }
        
        // Get size
        attributes.size = {
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        };
        
        // Get accessibility attributes
        if (element.getAttribute('aria-label')) {
            attributes.ariaLabel = element.getAttribute('aria-label');
        }
        if (element.getAttribute('aria-describedby')) {
            attributes.ariaDescribedBy = element.getAttribute('aria-describedby');
        }
        if (element.getAttribute('role')) {
            attributes.role = element.getAttribute('role');
        }
        if (element.tabIndex >= 0) {
            attributes.tabIndex = element.tabIndex;
        }
        
        return attributes;
    }

    /**
     * Update properties panel with element data
     */
    updatePropertiesPanel(elementData) {
        const propertiesDisplay = document.getElementById('properties-display');
        if (!propertiesDisplay) return;
        
        // Clear existing content
        propertiesDisplay.innerHTML = '';
        
        if (!elementData) {
            propertiesDisplay.innerHTML = '<div class="properties-empty"><p>Select an element to view its properties</p></div>';
            return;
        }
        
        // Create properties HTML
        const propertiesHTML = `
            <div class="property-group">
                <h3 class="property-group-title">Basic Information</h3>
                
                <div class="property-item">
                    <div class="property-label">Type</div>
                    <div class="property-value">${elementData.type || 'Unknown'}</div>
                </div>
                
                <div class="property-item">
                    <div class="property-label">Page</div>
                    <div class="property-value">${elementData.page}</div>
                </div>
                
                <div class="property-item">
                    <div class="property-label">Value</div>
                    <div class="property-value">${elementData.value}</div>
                </div>
                
                <div class="property-item">
                    <div class="property-label">Status</div>
                    <div class="property-value">${elementData.modified ? 'Modified' : 'Original'}</div>
                </div>
            </div>
            
            ${elementData.attributes.position ? `
            <div class="property-group">
                <h3 class="property-group-title">Position & Size</h3>
                
                <div class="property-item">
                    <div class="property-label">Position</div>
                    <div class="property-value">X: ${elementData.attributes.position.x}px, Y: ${elementData.attributes.position.y}px</div>
                </div>
                
                <div class="property-item">
                    <div class="property-label">Size</div>
                    <div class="property-value">${elementData.attributes.size.width} × ${elementData.attributes.size.height}px</div>
                </div>
            </div>
            ` : ''}
            
            ${Object.keys(elementData.attributes).filter(key => !['position', 'size'].includes(key)).length > 0 ? `
            <div class="property-group">
                <h3 class="property-group-title">Accessibility</h3>
                
                ${elementData.attributes.ariaLabel ? `
                <div class="property-item">
                    <div class="property-label">ARIA Label</div>
                    <div class="property-value">${elementData.attributes.ariaLabel}</div>
                </div>
                ` : ''}
                
                ${elementData.attributes.role ? `
                <div class="property-item">
                    <div class="property-label">Role</div>
                    <div class="property-value">${elementData.attributes.role}</div>
                </div>
                ` : ''}
                
                ${elementData.attributes.tabIndex !== undefined ? `
                <div class="property-item">
                    <div class="property-label">Tab Index</div>
                    <div class="property-value">${elementData.attributes.tabIndex}</div>
                </div>
                ` : ''}
            </div>
            ` : ''}
        `;
        
        propertiesDisplay.innerHTML = propertiesHTML;
        
        // Announce to screen reader
        this.utils.announceToScreenReader(`Properties updated for ${elementData.type} element`, 'polite');
    }

    /**
     * Update overlay view panel
     */
    updateOverlayView() {
        const overlayContainer = document.getElementById('overlay-container');
        if (!overlayContainer) return;
        
        // Get all overlay elements
        const overlayElements = document.querySelectorAll('[data-element-id]');
        
        if (overlayElements.length === 0) {
            overlayContainer.innerHTML = `
                <div class="overlay-instructions">
                    <p>No interactive elements found in the current PDF.</p>
                    <p>Elements will appear here once they are detected.</p>
                </div>
            `;
            return;
        }
        
        // Group elements by page
        const elementsByPage = {};
        overlayElements.forEach(element => {
            const pageNum = element.closest('.pdf-page')?.getAttribute('data-page-number') || '1';
            if (!elementsByPage[pageNum]) {
                elementsByPage[pageNum] = [];
            }
            elementsByPage[pageNum].push(element);
        });
        
        // Create overlay list
        let overlayHTML = '<div class="overlay-list">';
        
        Object.keys(elementsByPage).sort((a, b) => parseInt(a) - parseInt(b)).forEach(pageNum => {
            overlayHTML += `
                <div class="overlay-page-group">
                    <h4 class="overlay-page-title">Page ${pageNum}</h4>
                    <div class="overlay-items">
            `;
            
            elementsByPage[pageNum].forEach((element, index) => {
                const elementData = {
                    id: element.getAttribute('data-element-id'),
                    type: element.getAttribute('data-element-type'),
                    value: this.getElementValue(element),
                    modified: element.classList.contains('modified')
                };
                
                overlayHTML += `
                    <div class="overlay-item" data-element-ref="${elementData.id}">
                        <span class="overlay-item-type">${elementData.type}</span>
                        <span class="overlay-item-value">${elementData.value}</span>
                        ${elementData.modified ? '<span class="overlay-item-modified">Modified</span>' : ''}
                    </div>
                `;
            });
            
            overlayHTML += '</div></div>';
        });
        
        overlayHTML += '</div>';
        
        // Add CSS for overlay list
        const overlayStyles = `
            <style>
            .overlay-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .overlay-page-group {
                background: var(--white);
                border-radius: var(--border-radius-md);
                border: 1px solid var(--gray-200);
                padding: 1rem;
            }
            
            .overlay-page-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--gray-900);
                margin-bottom: 0.75rem;
            }
            
            .overlay-items {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .overlay-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                border-radius: var(--border-radius-sm);
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .overlay-item:hover {
                background: var(--gray-100);
            }
            
            .overlay-item-type {
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--gray-600);
                text-transform: uppercase;
                min-width: 80px;
            }
            
            .overlay-item-value {
                flex: 1;
                font-size: 0.875rem;
                color: var(--gray-900);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .overlay-item-modified {
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--success-color);
                background: var(--success-bg);
                padding: 0.125rem 0.5rem;
                border-radius: var(--border-radius-sm);
            }
            </style>
        `;
        
        overlayContainer.innerHTML = overlayStyles + overlayHTML;
        
        // Add click handlers to overlay items
        overlayContainer.querySelectorAll('.overlay-item').forEach(item => {
            item.addEventListener('click', () => {
                const elementId = item.getAttribute('data-element-ref');
                const element = document.querySelector(`[data-element-id="${elementId}"]`);
                if (element) {
                    element.focus();
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    this.selectElement(element);
                }
            });
        });
    }

    /**
     * Cleanup application
     */
    cleanup() {
        // Remove event listeners
        this.eventHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventHandlers.clear();
        
        // Cleanup components
        if (this.accessiblePDFCoordinator) {
            this.accessiblePDFCoordinator.cleanup();
        }
        
        if (this.unstructuredTextEditor) {
            this.unstructuredTextEditor.destroy();
        }
        
        if (this.pdfProcessor) {
            this.pdfProcessor.cleanup();
        }
        
        if (this.accessibility) {
            this.accessibility.cleanup();
        }
        
        console.log('Application cleanup complete');
    }
}

/**
 * Initialize unstructured text editor support
 */
async function initializeUnstructuredTextSupport() {
    try {
        console.log('Initializing unstructured text editing support...');
        
        // Add enhanced CSS styles if not already present
        if (!document.querySelector('#unstructured-text-editor-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'unstructured-text-editor-styles';
            styleSheet.textContent = `
                /* Enhanced Unstructured Text Editor Styles */
                .unstructured-text-editor-container {
                    position: absolute;
                    z-index: 999;
                    pointer-events: auto;
                }
                
                .unstructured-text-editor {
                    background: rgba(255, 255, 255, 0.98);
                    border: 2px solid #007acc;
                    border-radius: 6px;
                    padding: 10px;
                    font-family: inherit;
                    line-height: 1.4;
                    color: #333;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    resize: both;
                    overflow: auto;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                    transition: all 0.2s ease;
                    min-height: 40px;
                    min-width: 150px;
                    outline: none;
                }
                
                .unstructured-text-editor:focus {
                    border-color: #0056b3;
                    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25), 0 4px 16px rgba(0, 0, 0, 0.2);
                }
                
                .unstructured-text-editor.modified {
                    border-color: #28a745;
                    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
                }
                
                .unstructured-editor-controls {
                    display: flex;
                    gap: 4px;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                
                .unstructured-text-editor-container:hover .unstructured-editor-controls,
                .unstructured-text-editor-container:focus-within .unstructured-editor-controls {
                    opacity: 1;
                }
                
                .editor-control-btn {
                    background: #007acc;
                    color: white;
                    border: none;
                    padding: 6px 10px;
                    border-radius: 3px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                
                .editor-control-btn:hover {
                    background: #0056b3;
                }
                
                .editor-control-btn:focus {
                    outline: 2px solid #ffffff;
                    outline-offset: 2px;
                }
                
                .modification-indicator {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 16px;
                    height: 16px;
                    background: #28a745;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                
                /* High contrast mode support */
                .high-contrast-mode .unstructured-text-editor {
                    background: #000000 !important;
                    color: #ffffff !important;
                    border-color: #ffffff !important;
                }
                
                .high-contrast-mode .unstructured-text-editor:focus {
                    border-color: #ffff00 !important;
                    box-shadow: 0 0 0 3px #ffff00 !important;
                }
            `;
            document.head.appendChild(styleSheet);
            console.log('Enhanced unstructured text editor styles added');
        }
        
        // Announce to screen reader
        if (window.accessibility) {
            window.accessibility.announceToScreenReader(
                'Advanced text editing capabilities loaded',
                'polite'
            );
        }
        
        console.log('Unstructured text editing support initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize unstructured text support:', error);
    }
}

/**
 * Test unstructured text editor functionality
 */
async function testUnstructuredTextEditor() {
    console.log('🧪 Testing unstructured text editor...');
    
    // Check if the class is available
    if (typeof UnstructuredTextEditor === 'undefined') {
        console.error('❌ UnstructuredTextEditor not loaded!');
        return false;
    }
    
    // Create test elements (simulate extracted text)
    const testElements = [
        {
            id: 'test_1',
            type: 'text',
            text: 'This is a long paragraph of unstructured text that should be editable. It contains multiple sentences and represents the kind of content that Teachers of the Visually Impaired need to edit in educational documents.',
            x: 100,
            y: 100,
            width: 400,
            height: 60,
            fontSize: 12,
            pageNumber: 1
        },
        {
            id: 'test_2',
            type: 'text',
            text: 'Student Name: _______________',
            x: 100,
            y: 200,
            width: 200,
            height: 20,
            fontSize: 12,
            pageNumber: 1
        },
        {
            id: 'test_3',
            type: 'text',
            text: 'This assessment evaluates the student\'s understanding of basic concepts in mathematics and reading comprehension. The results will be used to determine appropriate instructional strategies and accommodations.',
            x: 100,
            y: 300,
            width: 450,
            height: 80,
            fontSize: 11,
            pageNumber: 1
        }
    ];
    
    // Test the editor
    if (window.nVDAPDFEditor && window.nVDAPDFEditor.accessiblePDFCoordinator && window.nVDAPDFEditor.accessiblePDFCoordinator.unstructuredTextEditor) {
        const editorsCreated = window.nVDAPDFEditor.accessiblePDFCoordinator.unstructuredTextEditor.processTextElements(testElements);
        console.log(`✅ Test created ${editorsCreated} editors`);
        
        if (editorsCreated > 0) {
            console.log('🎉 UNSTRUCTURED TEXT EDITING IS WORKING!');
            
            // Announce to screen reader
            if (window.nVDAPDFEditor.accessibility) {
                window.nVDAPDFEditor.accessibility.announceToScreenReader(
                    `Unstructured text editing test successful. ${editorsCreated} text areas are now editable.`,
                    'assertive'
                );
            }
            
            return true;
        }
    } else {
        console.error('❌ Components not properly initialized');
        console.log('Available components:', {
            nVDAPDFEditor: !!window.nVDAPDFEditor,
            accessiblePDFCoordinator: !!(window.nVDAPDFEditor && window.nVDAPDFEditor.accessiblePDFCoordinator),
            unstructuredTextEditor: !!(window.nVDAPDFEditor && window.nVDAPDFEditor.accessiblePDFCoordinator && window.nVDAPDFEditor.accessiblePDFCoordinator.unstructuredTextEditor)
        });
    }
    
    console.error('❌ Test failed');
    return false;
}

// Initialize application when DOM is loaded and PDF.js is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for PDF.js to be ready if it's not already loaded
        if (typeof window.pdfjsLib === 'undefined') {
            console.log('Waiting for PDF.js to be ready...');
            
            // Add timeout to prevent hanging
            const pdfJSTimeout = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('PDF.js loading timeout - continuing without it'));
                }, 10000); // 10 second timeout
            });
            
            const pdfJSReady = new Promise((resolve) => {
                window.addEventListener('pdfjs-ready', resolve, { once: true });
            });
            
            try {
                await Promise.race([pdfJSReady, pdfJSTimeout]);
                console.log('PDF.js is ready');
            } catch (timeoutError) {
                console.warn('PDF.js loading timed out, continuing with mock implementation');
                
                // Create mock PDF.js if it timed out
                if (typeof window.pdfjsLib === 'undefined') {
                    window.pdfjsLib = {
                        getDocument: () => Promise.reject(new Error('PDF.js not available')),
                        GlobalWorkerOptions: { workerSrc: '' },
                        OPS: {} // Mock operations
                    };
                }
            }
        }
        
        // Initialize unstructured text support
        await initializeUnstructuredTextSupport();
        
        console.log('Starting NVDA PDF Editor...');
        window.app = new NVDAPDFEditor();
        await window.app.initialize();
        
    } catch (error) {
        console.error('Failed to start application:', error);
        
        // Show error to user
        if (window.utils) {
            window.utils.showError('Failed to start application: ' + error.message);
        } else {
            alert('Failed to start application: ' + error.message);
        }
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NVDAPDFEditor;
} 