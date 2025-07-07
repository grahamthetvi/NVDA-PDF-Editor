/**
 * Utility Functions - AccessiblePDF Editor
 * Common functions for file handling, formatting, and accessibility
 * Adapted for Electron desktop environment
 */

class PDFEditorUtils {
    
    /**
     * File size formatting
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Generate unique identifier using crypto API for true uniqueness
     */
    static generateUniqueId() {
        // Use crypto API for truly unique IDs with fallback
        if (window.nodeAPI && window.nodeAPI.generateUUID) {
            return window.nodeAPI.generateUUID();
        }
        
        // Fallback to manual generation
        return `id-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Debounce function calls
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Throttle function calls
     */
    static throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
    
    /**
     * Convert File to ArrayBuffer with error handling
     */
    static fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const result = event.target.result;
                
                console.log(`FileReader result: ${result ? result.byteLength : 'null'} bytes`);
                
                if (!result) {
                    reject(new Error('FileReader returned empty result'));
                    return;
                }
                
                if (result.byteLength === 0) {
                    reject(new Error('FileReader returned buffer with 0 bytes'));
                    return;
                }
                
                console.log(`Successfully read file (${result.byteLength} bytes)`);
                resolve(result);
            };
            
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(new Error(`Failed to read file: ${error.message || 'Unknown FileReader error'}`));
            };
            
            reader.onabort = () => {
                reject(new Error('File reading was aborted'));
            };
            
            console.log(`Starting FileReader for: ${file.name} (${file.size} bytes)`);
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Convert ArrayBuffer to Base64
     */
    static arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
    
    /**
     * Convert Base64 to ArrayBuffer
     */
    static base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    /**
     * Validate file type
     */
    static validateFileType(file, allowedTypes = ['application/pdf']) {
        if (!file) {
            throw new Error('No file provided');
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
        }
        
        return true;
    }
    
    /**
     * Validate file size
     */
    static validateFileSize(file, maxSizeBytes = 50 * 1024 * 1024) { // 50MB default
        if (!file) {
            throw new Error('No file provided');
        }
        
        if (file.size > maxSizeBytes) {
            throw new Error(`File too large. Maximum size: ${this.formatFileSize(maxSizeBytes)}`);
        }
        
        return true;
    }
    
    /**
     * Announce message to screen readers
     */
    static announceToScreenReader(message, priority = 'polite') {
        if (window.accessibility) {
            window.accessibility.announceToScreenReader(message, priority);
        } else {
            // Fallback method
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', priority);
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            
            document.body.appendChild(announcement);
            announcement.textContent = message;
            
            setTimeout(() => {
                if (document.body.contains(announcement)) {
                    document.body.removeChild(announcement);
                }
            }, 1000);
        }
    }
    
    /**
     * Set focus with announcement
     */
    static setFocusWithAnnouncement(element, message) {
        if (!element) return;
        
        element.focus();
        
        if (message) {
            setTimeout(() => {
                this.announceToScreenReader(message, 'assertive');
            }, 100);
        }
    }
    
    /**
     * Create focus trap for modal dialogs
     */
    static trapFocus(container) {
        if (!container) return null;
        
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        const handleKeydown = (event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        event.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        event.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        };
        
        container.addEventListener('keydown', handleKeydown);
        
        // Return cleanup function
        return () => {
            container.removeEventListener('keydown', handleKeydown);
        };
    }
    
    /**
     * Format date with options
     */
    static formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        
        try {
            return new Intl.DateTimeFormat('en-US', formatOptions).format(new Date(date));
        } catch (error) {
            return new Date(date).toLocaleString();
        }
    }
    
    /**
     * Deep clone object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }
    
    /**
     * Check browser support for required features
     */
    static checkBrowserSupport() {
        const features = {
            arrayBuffer: typeof ArrayBuffer !== 'undefined',
            fileReader: typeof FileReader !== 'undefined',
            canvas: typeof HTMLCanvasElement !== 'undefined',
            webWorkers: typeof Worker !== 'undefined',
            indexedDB: typeof indexedDB !== 'undefined',
            crypto: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
            fetch: typeof fetch !== 'undefined',
            promises: typeof Promise !== 'undefined',
            async: typeof async !== 'undefined'
        };
        
        const unsupported = Object.entries(features)
            .filter(([feature, supported]) => !supported)
            .map(([feature]) => feature);
        
        if (unsupported.length > 0) {
            console.warn('Unsupported browser features:', unsupported);
        }
        
        return {
            supported: features,
            unsupported: unsupported,
            isFullySupported: unsupported.length === 0
        };
    }
    
    /**
     * Get device information
     */
    static getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            touchPoints: navigator.maxTouchPoints || 0
        };
    }
    
    /**
     * Measure text dimensions
     */
    static measureText(text, font = '12px Arial') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = font;
        const metrics = context.measureText(text);
        
        return {
            width: metrics.width,
            height: parseInt(font, 10) // Approximate height from font size
        };
    }
    
    /**
     * Download file (for Electron, this will trigger save dialog)
     */
    static async downloadFile(data, filename, mimeType = 'application/octet-stream') {
        try {
            // In Electron, use the save dialog
            if (window.electronAPI && window.electronAPI.savePDFDialog) {
                const result = await window.electronAPI.savePDFDialog(data, filename);
                if (result.success) {
                    this.announceToScreenReader(`File saved to ${result.filePath}`, 'assertive');
                    return result;
                } else if (!result.cancelled) {
                    throw new Error(result.error);
                }
                return result;
            }
            
            // Fallback for web environment
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return { success: true };
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }
    
    /**
     * Copy to clipboard
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                this.announceToScreenReader('Copied to clipboard', 'assertive');
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const result = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (result) {
                    this.announceToScreenReader('Copied to clipboard', 'assertive');
                }
                
                return result;
            }
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            this.announceToScreenReader('Failed to copy to clipboard', 'assertive');
            return false;
        }
    }
    
    /**
     * Parse URL parameters
     */
    static parseUrlParams(url = window.location.href) {
        const params = new URLSearchParams(new URL(url).search);
        const result = {};
        
        for (const [key, value] of params) {
            result[key] = value;
        }
        
        return result;
    }
    
    /**
     * Validate email address
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Sanitize filename for cross-platform compatibility
     */
    static sanitizeFilename(filename) {
        // Remove or replace invalid characters
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    
    /**
     * Calculate reading time for text
     */
    static calculateReadingTime(text, wordsPerMinute = 200) {
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return minutes;
    }
    
    /**
     * Generate random professional color
     */
    static generateRandomColor() {
        const colors = [
            '#2563eb', // Blue
            '#059669', // Green
            '#d97706', // Orange
            '#dc2626', // Red
            '#7c3aed', // Purple
            '#0891b2', // Cyan
            '#ea580c', // Orange-red
            '#16a34a'  // Green
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Retry operation with exponential backoff
     */
    static async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    break;
                }
                
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                await this.delay(delay);
            }
        }
        
        throw lastError;
    }
    
    /**
     * Delay execution
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Create standardized error object
     */
    static createError(message, code, context = {}) {
        const error = new Error(message);
        error.code = code;
        error.context = context;
        error.timestamp = new Date().toISOString();
        return error;
    }
    
    /**
     * Log error with context
     */
    static logError(error, context = {}) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            code: error.code,
            context: { ...error.context, ...context },
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error('Application Error:', errorInfo);
        
        // Send to error reporting service if available
        if (window.errorReporting) {
            window.errorReporting.reportError(errorInfo);
        }
        
        return errorInfo;
    }
    
    /**
     * Format error message for user display
     */
    static formatErrorForUser(error) {
        // Map technical errors to user-friendly messages
        const userFriendlyMessages = {
            'FileNotFoundError': 'The requested file could not be found.',
            'SecurityError': 'Access to this resource is not allowed.',
            'NetworkError': 'Unable to connect to the service. Please check your internet connection.',
            'QuotaExceededError': 'Not enough storage space available.',
            'InvalidStateError': 'The operation cannot be performed at this time.',
            'NotSupportedError': 'This feature is not supported by your browser.',
            'AbortError': 'The operation was cancelled.',
            'TimeoutError': 'The operation took too long to complete.'
        };
        
        const errorName = error.name || error.constructor.name;
        return userFriendlyMessages[errorName] || error.message || 'An unexpected error occurred.';
    }
    
    /**
     * Create performance timer
     */
    static createTimer(name) {
        const startTime = performance.now();
        
        return {
            name: name,
            start: startTime,
            
            stop() {
                const endTime = performance.now();
                const duration = endTime - startTime;
                console.log(`Timer "${name}": ${duration.toFixed(2)}ms`);
                return duration;
            },
            
            lap(lapName) {
                const lapTime = performance.now();
                const duration = lapTime - startTime;
                console.log(`Timer "${name}" lap "${lapName}": ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }
    
    /**
     * Get app information from Electron
     */
    static async getAppInfo() {
        if (window.electronAPI && window.electronAPI.getAppInfo) {
            return await window.electronAPI.getAppInfo();
        }
        
        return {
            name: 'AccessiblePDF Editor',
            version: '1.0.0',
            platform: navigator.platform,
            userAgent: navigator.userAgent
        };
    }
    
    /**
     * Show loading indicator
     */
    static showLoading(message = 'Loading...') {
        const loading = document.getElementById('loading-indicator');
        if (loading) {
            const loadingText = loading.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
            loading.style.display = 'flex';
            loading.setAttribute('aria-hidden', 'false');
            
            this.announceToScreenReader(message, 'assertive');
        }
    }
    
    /**
     * Hide loading indicator
     */
    static hideLoading() {
        const loading = document.getElementById('loading-indicator');
        if (loading) {
            loading.style.display = 'none';
            loading.setAttribute('aria-hidden', 'true');
        }
    }
    
    /**
     * Show error dialog
     */
    static showError(message, title = 'Error') {
        console.log('showError called with:', { message, title });
        
        const dialog = document.getElementById('error-dialog');
        console.log('Error dialog element found:', !!dialog);
        
        if (dialog) {
            const titleElement = dialog.querySelector('#error-title');
            const messageElement = dialog.querySelector('#error-message');
            
            console.log('Title element found:', !!titleElement);
            console.log('Message element found:', !!messageElement);
            
            if (titleElement) titleElement.textContent = title;
            if (messageElement) messageElement.textContent = message;
            
            dialog.style.display = 'block';
            dialog.style.zIndex = '1053';
            dialog.setAttribute('aria-hidden', 'false');
            
            console.log('Dialog display set to:', dialog.style.display);
            console.log('Dialog z-index set to:', dialog.style.zIndex);
            
            // Focus the OK button
            const okButton = dialog.querySelector('#btn-error-ok');
            if (okButton) {
                okButton.focus();
                console.log('Focus set to OK button');
            } else {
                console.warn('OK button not found');
            }
            
            this.announceToScreenReader(`${title}: ${message}`, 'assertive');
        } else {
            console.error('Error dialog element not found in DOM');
            // Fallback to alert
            alert(`${title}: ${message}`);
        }
    }
    
    /**
     * Hide error dialog
     */
    static hideError() {
        const dialog = document.getElementById('error-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            dialog.setAttribute('aria-hidden', 'true');
        }
    }
    
    /**
     * Update status message
     */
    static updateStatus(message) {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = message;
        }
        
        // Announce important status changes
        if (message.includes('Error') || message.includes('Success') || message.includes('Complete')) {
            this.announceToScreenReader(message, 'polite');
        }
    }
    
    /**
     * Update document info
     */
    static updateDocumentInfo(info) {
        const documentInfo = document.getElementById('document-info');
        if (documentInfo) {
            documentInfo.textContent = info;
        }
    }
    
    /**
     * Update page info
     */
    static updatePageInfo(currentPage, totalPages) {
        const pageInfo = document.getElementById('page-info');
        if (pageInfo) {
            const info = totalPages ? `Page ${currentPage} of ${totalPages}` : '';
            pageInfo.textContent = info;
        }
    }
    
    /**
     * Update zoom info
     */
    static updateZoomInfo(zoomLevel) {
        const zoomInfo = document.getElementById('zoom-info');
        const zoomDisplay = document.getElementById('zoom-level');
        
        const zoomText = `${Math.round(zoomLevel * 100)}%`;
        
        if (zoomInfo) {
            zoomInfo.textContent = zoomText;
        }
        
        if (zoomDisplay) {
            zoomDisplay.textContent = zoomText;
        }
    }
}

// Create global instance
window.utils = PDFEditorUtils;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFEditorUtils;
} 