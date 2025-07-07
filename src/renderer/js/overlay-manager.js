/**
 * Overlay Manager - AccessiblePDF Editor
 * Handles DOM overlays for interactive PDF editing with full accessibility support
 * Designed specifically for Teachers of the Visually Impaired
 */

class OverlayManager {
    constructor(pdfProcessor, accessibility) {
        this.pdfProcessor = pdfProcessor;
        this.accessibility = accessibility;
        
        // State
        this.currentPage = 1;
        this.currentZoom = 1.0;
        this.isEditMode = false;
        this.selectedFieldType = null;
        
        // Overlay containers
        this.overlayContainer = null;
        this.formFields = new Map(); // Our created form fields
        
        // Events
        this.onFieldCreated = null;
        this.onFieldSelected = null;
        
        console.log('Overlay Manager initialized');
    }
    
    /**
     * Initialize overlay system
     */
    initialize() {
        this.createOverlayContainer();
        this.setupEventListeners();
        
        console.log('Overlay system ready');
    }
    
    /**
     * Create the main overlay container
     */
    createOverlayContainer() {
        // Remove existing overlay if any
        const existing = document.getElementById('pdf-overlay-container');
        if (existing) {
            existing.remove();
        }
        
        // Create new overlay container
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.id = 'pdf-overlay-container';
        this.overlayContainer.className = 'pdf-overlay-container';
        this.overlayContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        `;
        
        // Insert overlay into PDF viewer
        const pdfViewer = document.getElementById('pdf-viewer');
        if (pdfViewer) {
            pdfViewer.style.position = 'relative';
            pdfViewer.appendChild(this.overlayContainer);
        }
    }
    
    /**
     * Setup event listeners for overlay interactions
     */
    setupEventListeners() {
        // Click handler for adding form fields
        if (this.overlayContainer) {
            this.overlayContainer.addEventListener('click', (event) => {
                if (this.isEditMode && this.selectedFieldType) {
                    this.handleOverlayClick(event);
                }
            });
        }
        
        // PDF viewer click handler
        const pdfViewer = document.getElementById('pdf-viewer');
        if (pdfViewer) {
            pdfViewer.addEventListener('click', (event) => {
                if (this.isEditMode && this.selectedFieldType) {
                    this.handlePDFClick(event);
                }
            });
        }
    }
    
    /**
     * Enable edit mode for adding form fields
     */
    enableEditMode(fieldType) {
        this.isEditMode = true;
        this.selectedFieldType = fieldType;
        
        // Change cursor to crosshair
        if (this.overlayContainer) {
            this.overlayContainer.style.pointerEvents = 'auto';
            this.overlayContainer.style.cursor = 'crosshair';
        }
        
        // Announce to screen reader
        if (window.utils) {
            window.utils.announceToScreenReader(
                `Edit mode enabled. Click on the PDF to add a ${fieldType} field.`,
                'assertive'
            );
        }
        
        console.log(`Edit mode enabled for ${fieldType} fields`);
    }
    
    /**
     * Disable edit mode
     */
    disableEditMode() {
        this.isEditMode = false;
        this.selectedFieldType = null;
        
        // Reset cursor
        if (this.overlayContainer) {
            this.overlayContainer.style.pointerEvents = 'none';
            this.overlayContainer.style.cursor = 'default';
        }
        
        console.log('Edit mode disabled');
    }
    
    /**
     * Handle clicks on the PDF for form field placement
     */
    handlePDFClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Get click coordinates relative to PDF canvas
        const canvas = document.querySelector('.pdf-page-canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / this.currentZoom;
        const y = (event.clientY - rect.top) / this.currentZoom;
        
        // Create form field at clicked location
        this.createFormField(this.selectedFieldType, x, y);
        
        // Exit edit mode after placing field
        this.disableEditMode();
    }
    
    /**
     * Handle clicks on the overlay container
     */
    handleOverlayClick(event) {
        // Delegate to PDF click handler
        this.handlePDFClick(event);
    }
    
    /**
     * Create a new form field at specified coordinates
     */
    createFormField(type, x, y, options = {}) {
        const fieldId = `overlay_field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Default dimensions for different field types
        const dimensions = this.getDefaultFieldDimensions(type);
        
        const fieldData = {
            id: fieldId,
            type: type,
            x: x,
            y: y,
            width: options.width || dimensions.width,
            height: options.height || dimensions.height,
            pageNumber: this.currentPage,
            name: options.name || `${type}_${this.formFields.size + 1}`,
            label: options.label || this.generateDefaultLabel(type),
            value: options.value || '',
            required: options.required || false,
            readonly: options.readonly || false
        };
        
        // Create DOM element
        const element = this.createFieldElement(fieldData);
        
        // Store field data
        this.formFields.set(fieldId, fieldData);
        
        // Add to overlay
        this.overlayContainer.appendChild(element);
        
        // Focus the new field for immediate editing
        element.focus();
        
        // Announce creation
        if (window.utils) {
            window.utils.announceToScreenReader(
                `${type} field created: ${fieldData.label}`,
                'assertive'
            );
        }
        
        // Trigger callback
        if (this.onFieldCreated) {
            this.onFieldCreated(fieldData);
        }
        
        console.log(`Created ${type} field:`, fieldData);
        
        return fieldData;
    }
    
    /**
     * Get default dimensions for field types
     */
    getDefaultFieldDimensions(type) {
        switch (type) {
            case 'text':
                return { width: 200, height: 25 };
            case 'checkbox':
                return { width: 20, height: 20 };
            case 'dropdown':
                return { width: 150, height: 25 };
            case 'signature':
                return { width: 300, height: 60 };
            default:
                return { width: 150, height: 25 };
        }
    }
    
    /**
     * Generate default label for field types
     */
    generateDefaultLabel(type) {
        switch (type) {
            case 'text':
                return 'Text Field';
            case 'checkbox':
                return 'Checkbox';
            case 'dropdown':
                return 'Dropdown';
            case 'signature':
                return 'Signature';
            default:
                return 'Form Field';
        }
    }
    
    /**
     * Create DOM element for form field
     */
    createFieldElement(fieldData) {
        let element;
        
        // Create appropriate HTML element based on field type
        switch (fieldData.type) {
            case 'text':
                element = this.createTextFieldElement(fieldData);
                break;
            case 'checkbox':
                element = this.createCheckboxElement(fieldData);
                break;
            case 'dropdown':
                element = this.createDropdownElement(fieldData);
                break;
            case 'signature':
                element = this.createSignatureElement(fieldData);
                break;
            default:
                element = this.createTextFieldElement(fieldData);
        }
        
        // Add appropriate CSS classes
        const baseClass = 'pdf-form-field-overlay';
        const typeClass = fieldData.type === 'checkbox' ? 'pdf-checkbox-overlay' : 
                         fieldData.type === 'signature' ? 'pdf-signature-overlay' : '';
        
        element.className = [baseClass, typeClass, 'newly-created'].filter(Boolean).join(' ');
        
        // Common styling and positioning
        element.style.cssText += `
            position: absolute;
            left: ${fieldData.x * this.currentZoom}px;
            top: ${fieldData.y * this.currentZoom}px;
            width: ${fieldData.width * this.currentZoom}px;
            height: ${fieldData.height * this.currentZoom}px;
            z-index: 20;
        `;
        
        // Accessibility attributes
        element.setAttribute('data-field-id', fieldData.id);
        element.setAttribute('data-field-type', fieldData.type);
        element.setAttribute('data-field-name', fieldData.name);
        element.setAttribute('data-page-number', fieldData.pageNumber);
        element.setAttribute('aria-label', fieldData.label);
        element.setAttribute('title', `${fieldData.type} field: ${fieldData.label}`);
        
        if (fieldData.required) {
            element.setAttribute('aria-required', 'true');
        }
        
        // Event listeners
        element.addEventListener('focus', () => this.handleFieldFocus(fieldData));
        element.addEventListener('blur', () => this.handleFieldBlur(fieldData));
        element.addEventListener('change', () => this.handleFieldChange(fieldData, element));
        
        // Remove newly-created class after animation
        setTimeout(() => {
            element.classList.remove('newly-created');
        }, 300);
        
        return element;
    }
    
    /**
     * Create text field element
     */
    createTextFieldElement(fieldData) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = fieldData.value;
        input.placeholder = fieldData.label;
        input.required = fieldData.required;
        input.readonly = fieldData.readonly;
        
        return input;
    }
    
    /**
     * Create checkbox element
     */
    createCheckboxElement(fieldData) {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = fieldData.value === 'true' || fieldData.value === true;
        checkbox.required = fieldData.required;
        checkbox.disabled = fieldData.readonly;
        
        const label = document.createElement('label');
        label.textContent = fieldData.label;
        label.style.marginLeft = '5px';
        label.style.fontSize = '14px';
        
        container.appendChild(checkbox);
        container.appendChild(label);
        
        return container;
    }
    
    /**
     * Create dropdown element
     */
    createDropdownElement(fieldData) {
        const select = document.createElement('select');
        select.required = fieldData.required;
        select.disabled = fieldData.readonly;
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `Select ${fieldData.label}`;
        select.appendChild(defaultOption);
        
        // Add sample options (can be customized later)
        const sampleOptions = ['Option 1', 'Option 2', 'Option 3'];
        sampleOptions.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            select.appendChild(option);
        });
        
        select.value = fieldData.value;
        
        return select;
    }
    
    /**
     * Create signature element
     */
    createSignatureElement(fieldData) {
        const container = document.createElement('div');
        container.style.cssText = `
            border: 1px dashed #666;
            background: #f9f9f9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #666;
            cursor: pointer;
        `;
        
        container.textContent = 'Click to sign';
        container.setAttribute('tabindex', '0');
        container.setAttribute('role', 'button');
        
        // Add click handler for signature functionality
        container.addEventListener('click', () => {
            this.openSignatureDialog(fieldData);
        });
        
        container.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.openSignatureDialog(fieldData);
            }
        });
        
        return container;
    }
    
    /**
     * Handle field focus
     */
    handleFieldFocus(fieldData) {
        if (window.utils) {
            window.utils.announceToScreenReader(
                `Focused ${fieldData.type} field: ${fieldData.label}`,
                'polite'
            );
        }
        
        if (this.onFieldSelected) {
            this.onFieldSelected(fieldData);
        }
    }
    
    /**
     * Handle field blur
     */
    handleFieldBlur(fieldData) {
        // Update field data when focus leaves
        this.updateFieldData(fieldData);
    }
    
    /**
     * Handle field value change
     */
    handleFieldChange(fieldData, element) {
        // Update field value
        if (fieldData.type === 'checkbox') {
            const checkbox = element.querySelector('input[type="checkbox"]');
            fieldData.value = checkbox ? checkbox.checked : false;
        } else if (element.value !== undefined) {
            fieldData.value = element.value;
        }
        
        // Update stored data
        this.formFields.set(fieldData.id, fieldData);
        
        console.log(`Field ${fieldData.id} updated:`, fieldData.value);
    }
    
    /**
     * Update form field data
     */
    updateFieldData(fieldData) {
        this.formFields.set(fieldData.id, fieldData);
    }
    
    /**
     * Open signature dialog (placeholder)
     */
    openSignatureDialog(fieldData) {
        if (window.utils) {
            window.utils.announceToScreenReader('Signature dialog would open here', 'assertive');
        }
        
        // TODO: Implement signature capture
        console.log('Opening signature dialog for field:', fieldData.id);
    }
    
    /**
     * Update overlay for new page/zoom
     */
    updateOverlay(pageNumber, zoomLevel) {
        this.currentPage = pageNumber;
        this.currentZoom = zoomLevel;
        
        // Clear existing overlays for different page
        if (pageNumber !== this.currentPage) {
            this.clearPageOverlays();
        }
        
        // Rescale existing overlays for zoom change
        this.rescaleOverlays();
    }
    
    /**
     * Clear overlays for current page
     */
    clearPageOverlays() {
        if (this.overlayContainer) {
            this.overlayContainer.innerHTML = '';
        }
        
        // Remove fields for current page from storage
        for (const [fieldId, fieldData] of this.formFields) {
            if (fieldData.pageNumber === this.currentPage) {
                this.formFields.delete(fieldId);
            }
        }
    }
    
    /**
     * Rescale overlays for zoom changes
     */
    rescaleOverlays() {
        const fields = this.overlayContainer?.children;
        if (!fields) return;
        
        for (const element of fields) {
            const fieldId = element.getAttribute('data-field-id');
            const fieldData = this.formFields.get(fieldId);
            
            if (fieldData) {
                element.style.left = `${fieldData.x * this.currentZoom}px`;
                element.style.top = `${fieldData.y * this.currentZoom}px`;
                element.style.width = `${fieldData.width * this.currentZoom}px`;
                element.style.height = `${fieldData.height * this.currentZoom}px`;
            }
        }
    }
    
    /**
     * Get all created form fields
     */
    getAllFormFields() {
        return Array.from(this.formFields.values());
    }
    
    /**
     * Export form field data for PDF saving
     */
    exportFormFieldData() {
        const fieldsData = [];
        
        for (const fieldData of this.formFields.values()) {
            fieldsData.push({
                type: fieldData.type,
                name: fieldData.name,
                label: fieldData.label,
                value: fieldData.value,
                x: fieldData.x,
                y: fieldData.y,
                width: fieldData.width,
                height: fieldData.height,
                pageNumber: fieldData.pageNumber,
                required: fieldData.required,
                readonly: fieldData.readonly
            });
        }
        
        return fieldsData;
    }
    
    /**
     * Cleanup overlay system
     */
    cleanup() {
        if (this.overlayContainer) {
            this.overlayContainer.remove();
            this.overlayContainer = null;
        }
        
        this.formFields.clear();
        this.isEditMode = false;
        this.selectedFieldType = null;
        
        console.log('Overlay Manager cleaned up');
    }
}

// Create global instance
window.overlayManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other components to be ready
    setTimeout(() => {
        if (window.pdfProcessor && window.accessibility) {
            window.overlayManager = new OverlayManager(window.pdfProcessor, window.accessibility);
            window.overlayManager.initialize();
            console.log('Overlay Manager instance created');
        }
    }, 1000);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverlayManager;
} 