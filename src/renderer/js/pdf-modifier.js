/**
 * PDF Modifier - AccessiblePDF Editor
 * Uses pdf-lib to modify PDF documents with form fields from DOM overlays
 * Designed specifically for Teachers of the Visually Impaired
 */

class PDFModifier {
    constructor() {
        this.isInitialized = false;
        this.usingIPC = false;
        
        console.log('PDF Modifier initialized (IPC mode)');
    }
    
    /**
     * Initialize PDF modifier (now using IPC instead of local pdf-lib)
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('Initializing PDF modifier (IPC mode)...');
            
            // Check if IPC is available
            if (window.electronAPI && window.electronAPI.modifyPDFWithFields) {
                console.log('IPC modifyPDFWithFields available');
                this.usingIPC = true;
            } else {
                console.warn('IPC modifyPDFWithFields not available');
                this.usingIPC = false;
            }
            
            // Check if nodeAPI is available (for debugging)
            if (window.nodeAPI) {
                console.log('nodeAPI available with properties:', Object.keys(window.nodeAPI));
                if (window.nodeAPI.pdfLibStatus) {
                    console.log('pdf-lib status in preload:', window.nodeAPI.pdfLibStatus);
                }
            } else {
                console.log('nodeAPI not available');
            }
            
            this.isInitialized = true;
            
            if (this.usingIPC) {
                console.log('PDF modifier initialized successfully (IPC mode)');
                console.log('Form fields will be processed by main process using pdf-lib');
            } else {
                console.warn('PDF modifier initialized in fallback mode');
                console.warn('Form fields will not be embedded in saved PDFs');
            }
            
        } catch (error) {
            console.error('Failed to initialize PDF modifier:', error);
            console.error('Error details:', error.message);
            
            // Continue in fallback mode
            console.warn('PDF modifier will run in fallback mode');
            this.isInitialized = true;
            this.usingIPC = false;
        }
    }
    
    async createModifiedPDF(originalPdfBuffer, formFields, numPages) {
        if (!this.usingIPC) {
            console.warn('IPC not available, returning original PDF');
            return originalPdfBuffer;
        }
        
        try {
            console.log('Sending PDF modification request via IPC...');
            console.log('Form fields to process:', formFields.length);
            
            // Convert buffer for IPC
            const transferableBuffer = originalPdfBuffer instanceof ArrayBuffer
                ? Array.from(new Uint8Array(originalPdfBuffer))
                : Array.from(originalPdfBuffer);
            
            // Call IPC with proper error handling
            const result = await window.electronAPI.modifyPDFWithFields(
                transferableBuffer,
                formFields
            );
            
            if (result.success) {
                console.log(`PDF modified successfully with ${result.fieldsAdded} fields`);
                // Convert back to Uint8Array
                return new Uint8Array(result.buffer);
            } else {
                console.error('PDF modification failed:', result.error);
                return originalPdfBuffer;
            }
            
        } catch (error) {
            console.error('IPC call failed:', error);
            return originalPdfBuffer;
        }
    }
    
    /**
     * Add a form field to the PDF document
     */
    async addFormFieldToPDF(form, pdfDoc, fieldData) {
        try {
            console.log(`Adding form field: ${fieldData.name} (${fieldData.type})`);
            
            // Get the page
            const pages = pdfDoc.getPages();
            console.log(`Total pages: ${pages.length}, requesting page: ${fieldData.pageNumber}`);
            
            const page = pages[fieldData.pageNumber - 1]; // Convert to 0-based index
            
            if (!page) {
                console.warn(`Page ${fieldData.pageNumber} not found, skipping field`);
                return;
            }
            
            // Get page dimensions
            const { width: pageWidth, height: pageHeight } = page.getSize();
            console.log(`Page dimensions: ${pageWidth} x ${pageHeight}`);
            
            // Convert coordinates from PDF.js to pdf-lib coordinate system
            // PDF.js uses top-left origin, pdf-lib uses bottom-left origin
            const x = fieldData.x;
            const y = pageHeight - fieldData.y - fieldData.height;
            const width = fieldData.width;
            const height = fieldData.height;
            
            console.log(`Field coordinates: (${x}, ${y}) ${width} x ${height}`);
            
            // Validate coordinates
            if (x < 0 || y < 0 || width <= 0 || height <= 0) {
                console.warn(`Invalid coordinates for field ${fieldData.name}, skipping`);
                return;
            }
            
            // Create form field based on type
            switch (fieldData.type) {
                case 'text':
                    await this.addTextField(form, fieldData, x, y, width, height);
                    break;
                    
                case 'checkbox':
                    await this.addCheckboxField(form, fieldData, x, y, width, height);
                    break;
                    
                case 'dropdown':
                    await this.addDropdownField(form, fieldData, x, y, width, height);
                    break;
                    
                case 'signature':
                    await this.addSignatureField(form, fieldData, x, y, width, height);
                    break;
                    
                default:
                    console.warn(`Unknown field type: ${fieldData.type}`);
                    throw new Error(`Unsupported field type: ${fieldData.type}`);
            }
            
            console.log(`Successfully processed field: ${fieldData.name}`);
            
        } catch (error) {
            console.error(`Failed to add ${fieldData.type} field "${fieldData.name}":`, error);
            throw error; // Re-throw to see what's failing
        }
    }
    
    /**
     * Add text field to PDF
     */
    async addTextField(form, fieldData, x, y, width, height) {
        const textField = form.createTextField(fieldData.name);
        textField.setText(fieldData.value || '');
        textField.setFontSize(12);
        
        // Add widget to specific page
        textField.addToPage(x, y, {
            width: width,
            height: height,
            pageIndex: fieldData.pageNumber - 1
        });
        
        // Set properties
        if (fieldData.required) {
            textField.markAsRequired();
        }
        
        if (fieldData.readonly) {
            textField.markAsReadOnly();
        }
        
        console.log(`Added text field: ${fieldData.name} at (${x}, ${y})`);
    }
    
    /**
     * Add checkbox field to PDF
     */
    async addCheckboxField(form, fieldData, x, y, width, height) {
        const checkboxField = form.createCheckBox(fieldData.name);
        
        // Set initial state
        if (fieldData.value === true || fieldData.value === 'true') {
            checkboxField.check();
        }
        
        // Add widget to specific page
        checkboxField.addToPage(x, y, {
            width: width,
            height: height,
            pageIndex: fieldData.pageNumber - 1
        });
        
        // Set properties
        if (fieldData.required) {
            checkboxField.markAsRequired();
        }
        
        if (fieldData.readonly) {
            checkboxField.markAsReadOnly();
        }
        
        console.log(`Added checkbox field: ${fieldData.name} at (${x}, ${y})`);
    }
    
    /**
     * Add dropdown field to PDF
     */
    async addDropdownField(form, fieldData, x, y, width, height) {
        // Default options if none provided
        const options = fieldData.options || ['Option 1', 'Option 2', 'Option 3'];
        
        const dropdownField = form.createDropdown(fieldData.name);
        dropdownField.setOptions(options);
        
        if (fieldData.value && options.includes(fieldData.value)) {
            dropdownField.select(fieldData.value);
        }
        
        // Add widget to specific page
        dropdownField.addToPage(x, y, {
            width: width,
            height: height,
            pageIndex: fieldData.pageNumber - 1
        });
        
        // Set properties
        if (fieldData.required) {
            dropdownField.markAsRequired();
        }
        
        if (fieldData.readonly) {
            dropdownField.markAsReadOnly();
        }
        
        console.log(`Added dropdown field: ${fieldData.name} at (${x}, ${y})`);
    }
    
    /**
     * Add signature field to PDF
     */
    async addSignatureField(form, fieldData, x, y, width, height) {
        // For signature fields, we'll create a text field with signature styling
        // pdf-lib doesn't have native signature fields, so we simulate them
        const signatureField = form.createTextField(fieldData.name);
        signatureField.setText(fieldData.value || '');
        signatureField.setFontSize(14);
        
        // Add widget to specific page
        signatureField.addToPage(x, y, {
            width: width,
            height: height,
            pageIndex: fieldData.pageNumber - 1
        });
        
        // Set properties
        if (fieldData.required) {
            signatureField.markAsRequired();
        }
        
        // Make it look like a signature field with border
        signatureField.setBorderWidth(2);
        
        console.log(`Added signature field: ${fieldData.name} at (${x}, ${y})`);
    }
    
    /**
     * Extract form field data from DOM overlay
     */
    extractFieldDataFromDOM(overlayElement) {
        const fieldData = {
            id: overlayElement.getAttribute('data-field-id'),
            type: overlayElement.getAttribute('data-field-type'),
            name: overlayElement.getAttribute('data-field-name') || 'untitled_field',
            label: overlayElement.getAttribute('aria-label') || 'Form Field',
            value: this.getFieldValue(overlayElement),
            required: overlayElement.getAttribute('aria-required') === 'true',
            readonly: overlayElement.hasAttribute('readonly'),
            // Position and size from CSS
            x: parseFloat(overlayElement.style.left) || 0,
            y: parseFloat(overlayElement.style.top) || 0,
            width: parseFloat(overlayElement.style.width) || 100,
            height: parseFloat(overlayElement.style.height) || 20,
            pageNumber: parseInt(overlayElement.getAttribute('data-page-number')) || 1
        };
        
        return fieldData;
    }
    
    /**
     * Get field value from DOM element
     */
    getFieldValue(element) {
        const input = element.querySelector('input, select, textarea');
        if (!input) return '';
        
        switch (input.type) {
            case 'checkbox':
                return input.checked;
            case 'text':
            case 'textarea':
                return input.value;
            default:
                return input.value;
        }
    }
    
    /**
     * Validate form field data
     */
    validateFieldData(fieldData) {
        const errors = [];
        
        if (!fieldData.name || fieldData.name.trim() === '') {
            errors.push('Field name is required');
        }
        
        if (!fieldData.type) {
            errors.push('Field type is required');
        }
        
        if (fieldData.x < 0 || fieldData.y < 0) {
            errors.push('Field position must be positive');
        }
        
        if (fieldData.width <= 0 || fieldData.height <= 0) {
            errors.push('Field dimensions must be positive');
        }
        
        if (fieldData.pageNumber < 1) {
            errors.push('Page number must be at least 1');
        }
        
        return errors;
    }
    
    /**
     * Get supported field types
     */
    getSupportedFieldTypes() {
        return ['text', 'checkbox', 'dropdown', 'signature'];
    }
    
    /**
     * Check if PDF modification is available (via IPC)
     */
    isAvailable() {
        return this.isInitialized && this.usingIPC && 
               window.electronAPI && 
               window.electronAPI.modifyPDFWithFields;
    }
    
    /**
     * Get version information
     */
    getVersion() {
        return {
            modifier: '1.0.0',
            pdfLib: this.pdfLib ? 'loaded' : 'not loaded'
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PDFModifier = PDFModifier;
} 