/**
 * Accessibility Module - AccessiblePDF Editor
 * WCAG 2.1 AA compliance and screen reader support for desktop application
 * Designed specifically for NVDA, JAWS, and Narrator compatibility
 */

class AccessibilityManager {
    constructor() {
        this.isInitialized = false;
        this.announceRegion = null;
        this.currentFocus = null;
        this.focusHistory = [];
        this.shortcuts = new Map();
        this.screenReaderMode = false;
        this.highContrastMode = false;
        this.reducedMotionMode = false;
        this.enhancedFocusMode = true;
        
        // Screen reader detection
        this.screenReaderDetected = this.detectScreenReader();
        
        // Initialize immediately
        this.initialize();
    }
    
    /**
     * Initialize accessibility system
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('Initializing accessibility system...');
            
            // Create announcement region
            this.createAnnounceRegion();
            
            // Setup keyboard navigation
            this.setupKeyboardNavigation();
            
            // Setup focus management
            this.setupFocusManagement();
            
            // Setup screen reader optimizations
            this.setupScreenReaderOptimizations();
            
            // Setup high contrast mode
            this.setupHighContrastMode();
            
            // Setup reduced motion support
            this.setupReducedMotionSupport();
            
            // Setup accessibility shortcuts
            this.setupAccessibilityShortcuts();
            
            // Setup ARIA live regions
            this.setupLiveRegions();
            
            // Setup page structure
            this.setupPageStructure();
            
            // Announce system ready
            this.announceToScreenReader('AccessiblePDF Editor accessibility system initialized. Press F1 for help.', 'polite');
            
            this.isInitialized = true;
            console.log('Accessibility system initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize accessibility system:', error);
            throw error;
        }
    }
    
    /**
     * Detect screen reader presence
     */
    detectScreenReader() {
        // Check for screen reader indicators
        const indicators = [
            navigator.userAgent.includes('NVDA'),
            navigator.userAgent.includes('JAWS'),
            navigator.userAgent.includes('Narrator'),
            !!window.speechSynthesis && window.speechSynthesis.getVoices().length > 0,
            window.navigator.maxTouchPoints === 0 && !window.navigator.userAgent.includes('Mobile')
        ];
        
        return indicators.some(indicator => indicator);
    }
    
    /**
     * Create announcement region for screen readers
     */
    createAnnounceRegion() {
        // Remove existing region if any
        const existing = document.getElementById('aria-announcements');
        if (existing) {
            existing.remove();
        }
        
        // Create new announcement region
        this.announceRegion = document.createElement('div');
        this.announceRegion.id = 'aria-announcements';
        this.announceRegion.className = 'sr-only';
        this.announceRegion.setAttribute('aria-live', 'assertive');
        this.announceRegion.setAttribute('aria-atomic', 'true');
        this.announceRegion.setAttribute('role', 'status');
        
        document.body.appendChild(this.announceRegion);
    }
    
    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message, priority = 'polite') {
        if (!this.announceRegion) {
            this.createAnnounceRegion();
        }
        
        // Set priority
        this.announceRegion.setAttribute('aria-live', priority);
        
        // Clear and set message
        this.announceRegion.textContent = '';
        setTimeout(() => {
            this.announceRegion.textContent = message;
        }, 10);
        
        // Visual announcement for debugging
        if (this.screenReaderDetected) {
            this.showVisualAnnouncement(message, priority);
        }
        
        console.log(`Screen reader announcement (${priority}): ${message}`);
    }
    
    /**
     * Show visual announcement for debugging
     */
    showVisualAnnouncement(message, priority = 'polite') {
        const announcement = document.createElement('div');
        announcement.className = `accessibility-announcement ${priority}`;
        announcement.innerHTML = `
            <div class="accessibility-announcement-title">${priority.toUpperCase()}</div>
            <div class="accessibility-announcement-text">${message}</div>
        `;
        
        document.body.appendChild(announcement);
        
        // Show with animation
        setTimeout(() => {
            announcement.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            announcement.classList.remove('show');
            setTimeout(() => {
                if (announcement.parentNode) {
                    announcement.parentNode.removeChild(announcement);
                }
            }, 300);
        }, 4000);
    }
    
    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        // Global keyboard handler
        document.addEventListener('keydown', (event) => {
            this.handleGlobalKeydown(event);
        });
        
        // Focus visible support
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }
    
    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeydown(event) {
        const key = event.key;
        const ctrl = event.ctrlKey;
        const shift = event.shiftKey;
        const alt = event.altKey;
        
        // Accessibility shortcuts
        if (key === 'F1') {
            event.preventDefault();
            this.showKeyboardShortcuts();
            return;
        }
        
        if (ctrl && shift && key === 'H') {
            event.preventDefault();
            this.toggleHighContrastMode();
            return;
        }
        
        if (ctrl && shift && key === 'F') {
            event.preventDefault();
            this.toggleEnhancedFocusMode();
            return;
        }
        
        if (ctrl && shift && key === ' ') {
            event.preventDefault();
            this.announceCurrentFocus();
            return;
        }
        
        if (ctrl && shift && key === 'R') {
            event.preventDefault();
            this.readDocumentStructure();
            return;
        }
        
        // Navigation shortcuts
        if (key === 'Escape') {
            this.handleEscapeKey();
            return;
        }
        
        // Tab order management
        if (key === 'Tab') {
            this.trackFocus();
        }
    }
    
    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Track focus changes
        document.addEventListener('focusin', (event) => {
            this.handleFocusIn(event);
        });
        
        document.addEventListener('focusout', (event) => {
            this.handleFocusOut(event);
        });
        
        // Setup focus trap for modals
        this.setupFocusTraps();
    }
    
    /**
     * Handle focus in event
     */
    handleFocusIn(event) {
        this.currentFocus = event.target;
        this.focusHistory.push(event.target);
        
        // Keep only last 10 focus items
        if (this.focusHistory.length > 10) {
            this.focusHistory.shift();
        }
        
        // Add focus indicator if enhanced focus mode is on
        if (this.enhancedFocusMode) {
            event.target.classList.add('enhanced-focus');
        }
        
        // Announce focus changes in screen reader mode
        if (this.screenReaderMode) {
            this.announceFocusChange(event.target);
        }
    }
    
    /**
     * Handle focus out event
     */
    handleFocusOut(event) {
        // Remove focus indicator
        event.target.classList.remove('enhanced-focus');
    }
    
    /**
     * Announce focus changes
     */
    announceFocusChange(element) {
        const role = element.getAttribute('role');
        const ariaLabel = element.getAttribute('aria-label');
        const title = element.getAttribute('title');
        const tagName = element.tagName.toLowerCase();
        
        let announcement = '';
        
        if (ariaLabel) {
            announcement = ariaLabel;
        } else if (title) {
            announcement = title;
        } else if (role) {
            announcement = `${role} ${element.textContent || ''}`;
        } else {
            announcement = `${tagName} ${element.textContent || ''}`;
        }
        
        if (element.disabled) {
            announcement += ' (disabled)';
        }
        
        if (element.getAttribute('aria-expanded') === 'true') {
            announcement += ' (expanded)';
        } else if (element.getAttribute('aria-expanded') === 'false') {
            announcement += ' (collapsed)';
        }
        
        this.announceToScreenReader(announcement, 'polite');
    }
    
    /**
     * Setup screen reader optimizations
     */
    setupScreenReaderOptimizations() {
        // Add skip links
        this.addSkipLinks();
        
        // Setup landmark roles
        this.setupLandmarkRoles();
        
        // Setup heading structure
        this.setupHeadingStructure();
        
        // Setup form labels
        this.setupFormLabels();
        
        // Setup table headers
        this.setupTableHeaders();
    }
    
    /**
     * Add skip links for navigation
     */
    addSkipLinks() {
        const skipNav = document.querySelector('.skip-nav');
        if (!skipNav) return;
        
        skipNav.addEventListener('click', (event) => {
            event.preventDefault();
            const target = document.querySelector(event.target.getAttribute('href'));
            if (target) {
                target.focus();
                this.announceToScreenReader(`Skipped to ${target.getAttribute('aria-label') || 'section'}`, 'assertive');
            }
        });
    }
    
    /**
     * Setup landmark roles
     */
    setupLandmarkRoles() {
        // Ensure all major sections have proper roles
        const sections = [
            { selector: '.app-header', role: 'banner' },
            { selector: '.main-content', role: 'main' },
            { selector: '.toolbar', role: 'toolbar' },
            { selector: '.pdf-viewer-panel', role: 'region' },
            { selector: '.properties-panel', role: 'region' },
            { selector: '.status-bar', role: 'status' }
        ];
        
        sections.forEach(section => {
            const element = document.querySelector(section.selector);
            if (element && !element.getAttribute('role')) {
                element.setAttribute('role', section.role);
            }
        });
    }
    
    /**
     * Setup heading structure
     */
    setupHeadingStructure() {
        // Ensure proper heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let currentLevel = 1;
        
        headings.forEach(heading => {
            const level = parseInt(heading.tagName.charAt(1));
            if (level > currentLevel + 1) {
                console.warn(`Heading level ${level} follows level ${currentLevel} - accessibility issue`);
            }
            currentLevel = level;
        });
    }
    
    /**
     * Setup form labels
     */
    setupFormLabels() {
        // Ensure all form controls have proper labels
        const controls = document.querySelectorAll('input, select, textarea');
        
        controls.forEach(control => {
            const id = control.getAttribute('id');
            const ariaLabel = control.getAttribute('aria-label');
            const ariaLabelledby = control.getAttribute('aria-labelledby');
            
            if (!id && !ariaLabel && !ariaLabelledby) {
                console.warn('Form control missing label:', control);
            }
        });
    }
    
    /**
     * Setup table headers
     */
    setupTableHeaders() {
        // Ensure all tables have proper headers
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            const headers = table.querySelectorAll('th');
            const cells = table.querySelectorAll('td');
            
            if (headers.length === 0) {
                console.warn('Table missing header cells:', table);
            }
            
            // Associate cells with headers
            cells.forEach(cell => {
                if (!cell.getAttribute('headers')) {
                    const headerText = this.findTableHeader(cell);
                    if (headerText) {
                        cell.setAttribute('aria-label', headerText);
                    }
                }
            });
        });
    }
    
    /**
     * Find table header for a cell
     */
    findTableHeader(cell) {
        const row = cell.parentElement;
        const table = row.closest('table');
        const cellIndex = Array.from(row.children).indexOf(cell);
        
        // Find header in same column
        const headerRow = table.querySelector('tr');
        if (headerRow) {
            const header = headerRow.children[cellIndex];
            if (header && header.tagName === 'TH') {
                return header.textContent.trim();
            }
        }
        
        return null;
    }
    
    /**
     * Setup high contrast mode
     */
    setupHighContrastMode() {
        // Check system preference
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        if (prefersHighContrast) {
            this.enableHighContrastMode();
        }
        
        // Listen for changes
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            if (e.matches) {
                this.enableHighContrastMode();
            } else {
                this.disableHighContrastMode();
            }
        });
    }
    
    /**
     * Toggle high contrast mode
     */
    toggleHighContrastMode() {
        if (this.highContrastMode) {
            this.disableHighContrastMode();
        } else {
            this.enableHighContrastMode();
        }
    }
    
    /**
     * Enable high contrast mode
     */
    enableHighContrastMode() {
        document.body.classList.add('high-contrast-mode');
        this.highContrastMode = true;
        this.announceToScreenReader('High contrast mode enabled', 'polite');
    }
    
    /**
     * Disable high contrast mode
     */
    disableHighContrastMode() {
        document.body.classList.remove('high-contrast-mode');
        this.highContrastMode = false;
        this.announceToScreenReader('High contrast mode disabled', 'polite');
    }
    
    /**
     * Setup reduced motion support
     */
    setupReducedMotionSupport() {
        // Check system preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            this.enableReducedMotionMode();
        }
        
        // Listen for changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            if (e.matches) {
                this.enableReducedMotionMode();
            } else {
                this.disableReducedMotionMode();
            }
        });
    }
    
    /**
     * Enable reduced motion mode
     */
    enableReducedMotionMode() {
        document.body.classList.add('reduced-motion-mode');
        this.reducedMotionMode = true;
    }
    
    /**
     * Disable reduced motion mode
     */
    disableReducedMotionMode() {
        document.body.classList.remove('reduced-motion-mode');
        this.reducedMotionMode = false;
    }
    
    /**
     * Toggle enhanced focus mode
     */
    toggleEnhancedFocusMode() {
        if (this.enhancedFocusMode) {
            this.disableEnhancedFocusMode();
        } else {
            this.enableEnhancedFocusMode();
        }
    }
    
    /**
     * Enable enhanced focus mode
     */
    enableEnhancedFocusMode() {
        document.body.classList.add('enhanced-focus-mode');
        this.enhancedFocusMode = true;
        this.announceToScreenReader('Enhanced focus indicators enabled', 'polite');
    }
    
    /**
     * Disable enhanced focus mode
     */
    disableEnhancedFocusMode() {
        document.body.classList.remove('enhanced-focus-mode');
        this.enhancedFocusMode = false;
        this.announceToScreenReader('Enhanced focus indicators disabled', 'polite');
    }
    
    /**
     * Setup accessibility shortcuts
     */
    setupAccessibilityShortcuts() {
        this.shortcuts.set('F1', 'Show keyboard shortcuts help');
        this.shortcuts.set('Ctrl+Shift+H', 'Toggle high contrast mode');
        this.shortcuts.set('Ctrl+Shift+F', 'Toggle enhanced focus indicators');
        this.shortcuts.set('Ctrl+Shift+Space', 'Announce current focus');
        this.shortcuts.set('Ctrl+Shift+R', 'Read document structure');
        this.shortcuts.set('Escape', 'Close dialogs or return to main content');
    }
    
    /**
     * Show keyboard shortcuts help
     */
    showKeyboardShortcuts() {
        console.log('showKeyboardShortcuts called');
        
        const modal = document.getElementById('keyboard-shortcuts-modal');
        console.log('Existing modal found:', !!modal);
        
        if (modal) {
            console.log('Showing existing modal');
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus first element
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
                console.log('Focused first element:', firstFocusable);
            }
            
            this.announceToScreenReader('Keyboard shortcuts dialog opened', 'assertive');
        } else {
            console.log('Creating new modal');
            this.createKeyboardShortcutsModal();
        }
    }
    
    /**
     * Create keyboard shortcuts modal
     */
    createKeyboardShortcutsModal() {
        console.log('Creating keyboard shortcuts modal');
        
        const modal = document.createElement('div');
        modal.id = 'keyboard-shortcuts-modal';
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'shortcuts-title');
        modal.setAttribute('aria-hidden', 'false');
        
        const shortcuts = [
            { action: 'Open PDF file', keys: 'Ctrl+O' },
            { action: 'Save PDF file', keys: 'Ctrl+S' },
            { action: 'Save as...', keys: 'Ctrl+Shift+S' },
            { action: 'Zoom in', keys: 'Ctrl+Plus' },
            { action: 'Zoom out', keys: 'Ctrl+Minus' },
            { action: 'Reset zoom', keys: 'Ctrl+0' },
            { action: 'Previous page', keys: 'Page Up' },
            { action: 'Next page', keys: 'Page Down' },
            { action: 'First page', keys: 'Ctrl+Home' },
            { action: 'Last page', keys: 'Ctrl+End' },
            { action: 'Add text field', keys: 'Ctrl+Shift+T' },
            { action: 'Add checkbox', keys: 'Ctrl+Shift+C' },
            { action: 'Add dropdown', keys: 'Ctrl+Shift+D' },
            { action: 'Add signature field', keys: 'Ctrl+Shift+S' },
            { action: 'Exit edit mode', keys: 'Escape' },
            { action: 'Run OCR', keys: 'Ctrl+Shift+O' },
            { action: 'Keyboard shortcuts', keys: 'F1' },
            { action: 'Toggle high contrast', keys: 'Ctrl+Shift+H' },
            { action: 'Toggle focus indicators', keys: 'Ctrl+Shift+F' },
            { action: 'Announce current focus', keys: 'Ctrl+Shift+Space' },
            { action: 'Read document structure', keys: 'Ctrl+Shift+R' }
        ];

        modal.innerHTML = `
            <div class="modal-overlay" aria-hidden="true"></div>
            <div class="keyboard-shortcuts">
                <div class="keyboard-shortcuts-header">
                    <h2 id="shortcuts-title" class="keyboard-shortcuts-title">Keyboard Shortcuts</h2>
                    <button class="btn btn-icon modal-close" aria-label="Close shortcuts dialog">
                        <span class="btn-text">X</span>
                    </button>
                </div>
                <div class="keyboard-shortcuts-list">
                    ${shortcuts.map(shortcut => `
                        <div class="keyboard-shortcut">
                            <div class="keyboard-shortcut-action">${shortcut.action}</div>
                            <div class="keyboard-shortcut-keys">${shortcut.keys}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('Modal appended to body');
        
        // Setup event listeners
        const closeButton = modal.querySelector('.modal-close');
        closeButton.addEventListener('click', () => {
            console.log('Close button clicked');
            this.closeKeyboardShortcutsModal();
        });
        
        const overlay = modal.querySelector('.modal-overlay');
        overlay.addEventListener('click', () => {
            console.log('Overlay clicked');
            this.closeKeyboardShortcutsModal();
        });
        
        // Setup focus trap
        this.setupFocusTrap(modal);
        
        // Show modal
        modal.style.display = 'block';
        modal.style.zIndex = '1052';
        console.log('Modal display set to block, z-index:', modal.style.zIndex);
        
        closeButton.focus();
        console.log('Focus set to close button');
        
        this.announceToScreenReader('Keyboard shortcuts dialog opened', 'assertive');
    }
    
    /**
     * Close keyboard shortcuts modal
     */
    closeKeyboardShortcutsModal() {
        const modal = document.getElementById('keyboard-shortcuts-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            
            // Return focus to previously focused element
            if (this.currentFocus) {
                this.currentFocus.focus();
            }
            
            this.announceToScreenReader('Keyboard shortcuts dialog closed', 'assertive');
        }
    }
    
    /**
     * Setup focus trap for modal
     */
    setupFocusTrap(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        modal.addEventListener('keydown', (event) => {
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
            
            if (event.key === 'Escape') {
                this.closeKeyboardShortcutsModal();
            }
        });
    }
    
    /**
     * Setup focus traps for all modals
     */
    setupFocusTraps() {
        // This will be called for each modal as they are created
    }
    
    /**
     * Setup live regions
     */
    setupLiveRegions() {
        // Status bar should be a live region
        const statusBar = document.querySelector('.status-bar');
        if (statusBar) {
            statusBar.setAttribute('aria-live', 'polite');
            statusBar.setAttribute('aria-atomic', 'false');
        }
        
        // Document info should be a live region
        const documentInfo = document.querySelector('#document-info');
        if (documentInfo) {
            documentInfo.setAttribute('aria-live', 'polite');
            documentInfo.setAttribute('aria-atomic', 'true');
        }
    }
    
    /**
     * Setup page structure
     */
    setupPageStructure() {
        // Ensure main content is properly labeled
        const mainContent = document.querySelector('#main-content');
        if (mainContent) {
            mainContent.setAttribute('aria-label', 'Main content area');
        }
        
        // Ensure toolbar is properly labeled
        const toolbar = document.querySelector('#toolbar');
        if (toolbar) {
            toolbar.setAttribute('aria-label', 'PDF editing toolbar');
        }
    }
    
    /**
     * Announce current focus
     */
    announceCurrentFocus() {
        if (this.currentFocus) {
            this.announceFocusChange(this.currentFocus);
        } else {
            this.announceToScreenReader('No element currently focused', 'assertive');
        }
    }
    
    /**
     * Read document structure
     */
    readDocumentStructure() {
        const structure = this.analyzeDocumentStructure();
        this.announceToScreenReader(structure, 'assertive');
    }
    
    /**
     * Analyze document structure
     */
    analyzeDocumentStructure() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const landmarks = document.querySelectorAll('[role="banner"], [role="main"], [role="complementary"], [role="contentinfo"]');
        const forms = document.querySelectorAll('form');
        const tables = document.querySelectorAll('table');
        
        let structure = 'Document structure: ';
        
        if (headings.length > 0) {
            structure += `${headings.length} headings, `;
        }
        
        if (landmarks.length > 0) {
            structure += `${landmarks.length} landmarks, `;
        }
        
        if (forms.length > 0) {
            structure += `${forms.length} forms, `;
        }
        
        if (tables.length > 0) {
            structure += `${tables.length} tables, `;
        }
        
        structure = structure.replace(/, $/, '');
        
        return structure;
    }
    
    /**
     * Handle escape key
     */
    handleEscapeKey() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal[aria-hidden="false"]');
        modals.forEach(modal => {
            const closeButton = modal.querySelector('.modal-close');
            if (closeButton) {
                closeButton.click();
            }
        });
        
        // Return focus to main content if no modals
        if (modals.length === 0) {
            const mainContent = document.querySelector('#main-content');
            if (mainContent) {
                mainContent.focus();
                this.announceToScreenReader('Focus returned to main content', 'polite');
            }
        }
    }
    
    /**
     * Track focus for tab order
     */
    trackFocus() {
        // This could be used to build a focus order map
        // For now, just ensure proper tab order exists
    }
    
    /**
     * Get accessibility statistics
     */
    getAccessibilityStats() {
        return {
            screenReaderDetected: this.screenReaderDetected,
            highContrastMode: this.highContrastMode,
            reducedMotionMode: this.reducedMotionMode,
            enhancedFocusMode: this.enhancedFocusMode,
            screenReaderMode: this.screenReaderMode,
            focusHistoryLength: this.focusHistory.length,
            shortcutsCount: this.shortcuts.size
        };
    }
    
    /**
     * Cleanup accessibility resources
     */
    cleanup() {
        if (this.announceRegion) {
            this.announceRegion.remove();
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        document.removeEventListener('focusin', this.handleFocusIn);
        document.removeEventListener('focusout', this.handleFocusOut);
        
        this.isInitialized = false;
    }
}

// Create global accessibility instance
window.accessibility = new AccessibilityManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
} 