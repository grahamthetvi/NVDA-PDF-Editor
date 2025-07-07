/**
 * Preload Script - AccessiblePDF Editor
 * Provides secure IPC communication between main and renderer processes
 */

const { contextBridge, ipcRenderer } = require('electron');

try {
    // Expose protected methods that allow the renderer process to use
    // the ipcRenderer without exposing the entire object
    contextBridge.exposeInMainWorld('electronAPI', {
        // File operations
        openPDFDialog: () => ipcRenderer.invoke('open-pdf-dialog'),
        savePDFDialog: (buffer, defaultName) => ipcRenderer.invoke('save-pdf-dialog', buffer, defaultName),
        exportDataDialog: (data, defaultName, format) => ipcRenderer.invoke('export-data-dialog', data, defaultName, format),
        
        // ✅ ADD: PDF modification with form fields
        modifyPDFWithFields: (pdfBuffer, formFields) => ipcRenderer.invoke('modify-pdf-with-fields', pdfBuffer, formFields),
        
        // Theme handling
        getTheme: () => ipcRenderer.invoke('get-theme'),
        setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
        onThemeChanged: (callback) => ipcRenderer.on('theme-changed', callback),
        
        // App info
        getAppInfo: () => ipcRenderer.invoke('get-app-info'),
        
        // Menu events
        onMenuAction: (callback) => {
            const menuEvents = [
                'menu-open-pdf',
                'menu-save-pdf',
                'menu-save-as-pdf',
                'menu-export-json',
                'menu-export-csv',
                'menu-zoom-in',
                'menu-zoom-out',
                'menu-zoom-reset',
                'menu-toggle-high-contrast',
                'menu-toggle-focus-indicators',
                'menu-add-text-field',
                'menu-add-checkbox',
                'menu-add-dropdown',
                'menu-add-signature-field',
                'menu-run-ocr',
                'menu-analyze-structure',
                'menu-screen-reader-help',
                'menu-keyboard-shortcuts',
                'menu-accessibility-settings',
                'menu-announce-focus',
                'menu-read-structure',
                'menu-user-guide',
                'menu-accessibility-guide'
            ];
            
            menuEvents.forEach(event => {
                ipcRenderer.on(event, callback);
            });
        },
        
        // Remove menu event listeners
        removeMenuListeners: () => {
            ipcRenderer.removeAllListeners();
        }
    });

    // Node.js APIs available in the renderer process - safer approach
    let nodeAPIAvailable = false;
    
    try {
        // Check if Node.js APIs are available first
        const path = require('path');
        const crypto = require('crypto');
        nodeAPIAvailable = true;
        
        console.log('Node.js APIs available in preload');
        
        // Try to load pdf-lib with multiple strategies
        let pdfLib = null;
        let pdfLibStatus = 'not-loaded';
        
        console.log('Attempting to load pdf-lib...');
        
        try {
            // Strategy 1: Direct require
            pdfLib = require('pdf-lib');
            pdfLibStatus = 'loaded-direct';
            console.log('pdf-lib loaded successfully via direct require');
            console.log('pdf-lib exports:', Object.keys(pdfLib));
            
            // Validate key components
            if (pdfLib.PDFDocument) {
                console.log('PDFDocument constructor available');
            } else {
                console.warn('PDFDocument constructor not found');
            }
            
        } catch (pdfLibError) {
            console.warn('pdf-lib not available via direct require:', pdfLibError.message);
            
            // Strategy 2: Try require.resolve
            try {
                const pdfLibPath = require.resolve('pdf-lib');
                console.log('pdf-lib resolved to:', pdfLibPath);
                pdfLib = require(pdfLibPath);
                pdfLibStatus = 'loaded-via-resolve';
                console.log('pdf-lib loaded via require.resolve');
                console.log('pdf-lib exports:', Object.keys(pdfLib));
            } catch (alternativeError) {
                console.warn('pdf-lib not available via require.resolve:', alternativeError.message);
                
                // Strategy 3: Try loading from node_modules explicitly
                try {
                    const fs = require('fs');
                    const pdfLibNodeModulesPath = path.join(__dirname, '..', 'node_modules', 'pdf-lib');
                    
                    if (fs.existsSync(pdfLibNodeModulesPath)) {
                        console.log('pdf-lib directory found at:', pdfLibNodeModulesPath);
                        pdfLib = require(pdfLibNodeModulesPath);
                        pdfLibStatus = 'loaded-explicit-path';
                        console.log('pdf-lib loaded via explicit path');
                    } else {
                        console.warn('pdf-lib directory not found at:', pdfLibNodeModulesPath);
                    }
                } catch (explicitError) {
                    console.warn('pdf-lib not available via explicit path:', explicitError.message);
                    pdfLibStatus = 'failed-all-strategies';
                }
            }
        }
        
        console.log('pdf-lib loading status:', pdfLibStatus);
        
        contextBridge.exposeInMainWorld('nodeAPI', {
            path: {
                join: (...args) => path.join(...args),
                basename: (p, ext) => path.basename(p, ext),
                dirname: (p) => path.dirname(p),
                extname: (p) => path.extname(p)
            },
            
            // PDF-lib access with status information
            pdfLib: pdfLib,
            pdfLibStatus: pdfLibStatus,
            
            // Utility functions
            generateUUID: () => {
                try {
                    return crypto.randomUUID();
                } catch (error) {
                    // Fallback for older Node.js versions
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        const r = Math.random() * 16 | 0;
                        const v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                }
            },
            
            // Environment info
            platform: process.platform,
            arch: process.arch,
            version: process.version
        });
        
    } catch (nodeError) {
        console.warn('Node.js APIs unavailable in preload:', nodeError.message);
        nodeAPIAvailable = false;
    }
    
    // If Node.js APIs are not available, provide minimal fallback
    if (!nodeAPIAvailable) {
        console.log('Providing fallback nodeAPI implementation');
        
        contextBridge.exposeInMainWorld('nodeAPI', {
            path: {
                join: (...args) => args.filter(arg => arg).join('/').replace(/\/+/g, '/'),
                basename: (p) => p ? p.split('/').pop() : '',
                dirname: (p) => p ? p.split('/').slice(0, -1).join('/') : '',
                extname: (p) => {
                    if (!p) return '';
                    const parts = p.split('.');
                    return parts.length > 1 ? '.' + parts.pop() : '';
                }
            },
            generateUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }),
            platform: 'unknown',
            arch: 'unknown',
            version: 'unknown',
            pdfLib: null,
            pdfLibStatus: 'nodeapi-unavailable'
        });
    }

    console.log('AccessiblePDF Editor preload script loaded successfully');
    console.log('Secure IPC bridge established');

} catch (error) {
    console.error('Failed to load preload script:', error);
}

// Prevent access to Node.js APIs in renderer
delete window.require;
delete window.exports;
delete window.module; 