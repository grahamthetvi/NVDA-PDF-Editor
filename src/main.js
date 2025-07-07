/**
 * Main Electron Process - AccessiblePDF Editor
 * Professional PDF Editor for Teachers of the Visually Impaired
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// ✅ CRITICAL FIX: Import pdf-lib for main process PDF modification
let PDFLib = null;
try {
    PDFLib = require('pdf-lib');
    const { PDFDocument } = PDFLib; // Extract PDFDocument for easier access
    console.log('pdf-lib loaded successfully in main process');
} catch (error) {
    console.warn('pdf-lib not available in main process:', error.message);
}

// Keep a global reference of the window object
let mainWindow;
let isDevMode = process.argv.includes('--dev');

/**
 * Create the main application window
 */
function createMainWindow() {
    // Create the browser window with accessibility features
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        },
        title: 'AccessiblePDF Editor - Professional PDF Editor for Teachers of the Visually Impaired',
        show: false, // Don't show until ready
        backgroundColor: '#ffffff',
        
        // Accessibility features
        accessibleTitle: 'AccessiblePDF Editor - Professional PDF Editor for Teachers of the Visually Impaired',
        titleBarStyle: 'default',
        
        // Windows-specific accessibility
        ...(process.platform === 'win32' && {
            frame: true,
            titleBarStyle: 'default'
        })
    });

    // Load the app
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Focus for screen readers
        mainWindow.focus();
        
        // Announce app ready to screen readers
        mainWindow.webContents.executeJavaScript(`
            if (typeof window.accessibility !== 'undefined') {
                window.accessibility.announceToScreenReader('AccessiblePDF Editor is ready', 'assertive');
            }
        `);
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Development tools
    if (isDevMode) {
        mainWindow.webContents.openDevTools();
    }
    
    // Temporarily disable dev tools - issues fixed
    // mainWindow.webContents.openDevTools();

    // Handle theme changes for accessibility
    nativeTheme.on('updated', () => {
        mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
    });
}

/**
 * Create application menu with accessibility features
 */
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open PDF...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.send('menu-open-pdf');
                    }
                },
                {
                    label: 'Save PDF',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save-pdf');
                    }
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save-as-pdf');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export',
                    submenu: [
                        {
                            label: 'Export Form Data as JSON...',
                            click: () => {
                                mainWindow.webContents.send('menu-export-json');
                            }
                        },
                        {
                            label: 'Export Form Data as CSV...',
                            click: () => {
                                mainWindow.webContents.send('menu-export-csv');
                            }
                        }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo'
                },
                {
                    label: 'Redo',
                    accelerator: 'CmdOrCtrl+Y',
                    role: 'redo'
                },
                { type: 'separator' },
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                },
                { type: 'separator' },
                {
                    label: 'Select All',
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectall'
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        mainWindow.webContents.send('menu-zoom-in');
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        mainWindow.webContents.send('menu-zoom-out');
                    }
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.send('menu-zoom-reset');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Toggle High Contrast',
                    accelerator: 'CmdOrCtrl+Shift+H',
                    click: () => {
                        mainWindow.webContents.send('menu-toggle-high-contrast');
                    }
                },
                {
                    label: 'Toggle Focus Indicators',
                    accelerator: 'CmdOrCtrl+Shift+F',
                    click: () => {
                        mainWindow.webContents.send('menu-toggle-focus-indicators');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: 'PDF',
            submenu: [
                {
                    label: 'Add Text Field',
                    accelerator: 'CmdOrCtrl+Shift+T',
                    click: () => {
                        mainWindow.webContents.send('menu-add-text-field');
                    }
                },
                {
                    label: 'Add Checkbox',
                    accelerator: 'CmdOrCtrl+Shift+C',
                    click: () => {
                        mainWindow.webContents.send('menu-add-checkbox');
                    }
                },
                {
                    label: 'Add Dropdown',
                    accelerator: 'CmdOrCtrl+Shift+D',
                    click: () => {
                        mainWindow.webContents.send('menu-add-dropdown');
                    }
                },
                {
                    label: 'Add Signature Field',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        mainWindow.webContents.send('menu-add-signature-field');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Run OCR on Current Page',
                    accelerator: 'CmdOrCtrl+Shift+O',
                    click: () => {
                        mainWindow.webContents.send('menu-run-ocr');
                    }
                },
                {
                    label: 'Analyze PDF Structure',
                    accelerator: 'CmdOrCtrl+Shift+A',
                    click: () => {
                        mainWindow.webContents.send('menu-analyze-structure');
                    }
                }
            ]
        },
        {
            label: 'Accessibility',
            submenu: [
                {
                    label: 'Screen Reader Help',
                    accelerator: 'F1',
                    click: () => {
                        mainWindow.webContents.send('menu-screen-reader-help');
                    }
                },
                {
                    label: 'Keyboard Shortcuts',
                    accelerator: 'CmdOrCtrl+/',
                    click: () => {
                        mainWindow.webContents.send('menu-keyboard-shortcuts');
                    }
                },
                {
                    label: 'Accessibility Settings',
                    click: () => {
                        mainWindow.webContents.send('menu-accessibility-settings');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Announce Current Focus',
                    accelerator: 'CmdOrCtrl+Shift+Space',
                    click: () => {
                        mainWindow.webContents.send('menu-announce-focus');
                    }
                },
                {
                    label: 'Read Document Structure',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        mainWindow.webContents.send('menu-read-structure');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'User Guide',
                    click: () => {
                        mainWindow.webContents.send('menu-user-guide');
                    }
                },
                {
                    label: 'Accessibility Guide',
                    click: () => {
                        mainWindow.webContents.send('menu-accessibility-guide');
                    }
                },
                { type: 'separator' },
                {
                    label: 'About AccessiblePDF Editor',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About AccessiblePDF Editor',
                            message: 'AccessiblePDF Editor',
                            detail: 'Professional PDF Editor for Teachers of the Visually Impaired\nVersion 1.0.0\n\nDesigned with accessibility in mind, fully compatible with NVDA, JAWS, and other screen readers.',
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * Handle IPC communications
 */
function setupIPC() {
    // File operations
    ipcMain.handle('open-pdf-dialog', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Open PDF File',
            defaultPath: app.getPath('documents'),
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            try {
                const fileBuffer = await fs.readFile(filePath);
                
                // ✅ FIXED: Convert buffer to transferable format to prevent IPC detachment
                const transferableBuffer = Array.from(fileBuffer);
                
                console.log(`Read PDF file: ${fileBuffer.length} bytes, converted to transferable array`);
                
                return {
                    success: true,
                    filePath: filePath,
                    fileName: path.basename(filePath),
                    fileSize: fileBuffer.length,
                    buffer: transferableBuffer
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return { success: false, cancelled: true };
    });

    // Fix the save dialog handler to prevent duplicate dialogs
    let saveDialogOpen = false;

    ipcMain.handle('save-pdf-dialog', async (event, buffer, defaultName) => {
        // Prevent duplicate dialogs
        if (saveDialogOpen) {
            console.log('Save dialog already open, ignoring duplicate request');
            return { success: false, error: 'Save dialog already open' };
        }
        
        saveDialogOpen = true;
        
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                title: 'Save PDF File',
                defaultPath: path.join(app.getPath('documents'), defaultName || 'edited-document.pdf'),
                filters: [
                    { name: 'PDF Files', extensions: ['pdf'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['createDirectory', 'showOverwriteConfirmation']
            });
            
            if (!result.canceled && result.filePath) {
                try {
                    // Convert buffer to proper format for file writing
                    let fileBuffer;
                    if (buffer instanceof Uint8Array) {
                        fileBuffer = Buffer.from(buffer);
                    } else if (Array.isArray(buffer)) {
                        fileBuffer = Buffer.from(buffer);
                    } else if (buffer instanceof ArrayBuffer) {
                        fileBuffer = Buffer.from(buffer);
                    } else if (Buffer.isBuffer(buffer)) {
                        fileBuffer = buffer;
                    } else {
                        // Try to convert to Buffer
                        fileBuffer = Buffer.from(buffer);
                    }
                    
                    console.log(`Saving PDF: ${result.filePath} (${fileBuffer.length} bytes)`);
                    
                    // Verify the PDF is valid before saving
                    if (PDFLib) {
                        try {
                            const pdfDoc = await PDFLib.PDFDocument.load(fileBuffer);
                            console.log(`PDF validated: ${pdfDoc.getPageCount()} pages`);
                        } catch (validationError) {
                            console.error('PDF validation failed:', validationError);
                            // Continue with save anyway
                        }
                    }
                    
                    // Write file
                    await fs.writeFile(result.filePath, fileBuffer);
                    
                    console.log('PDF saved successfully');
                    return {
                        success: true,
                        filePath: result.filePath
                    };
                    
                } catch (error) {
                    console.error('Failed to save PDF file:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
            
            return { success: false, cancelled: true };
            
        } finally {
            saveDialogOpen = false;
        }
    });

    ipcMain.handle('export-data-dialog', async (event, data, defaultName, format) => {
        const extension = format === 'json' ? 'json' : 'csv';
        const result = await dialog.showSaveDialog(mainWindow, {
            title: `Export ${format.toUpperCase()} Data`,
            defaultPath: path.join(app.getPath('documents'), `${defaultName || 'form-data'}.${extension}`),
            filters: [
                { name: `${format.toUpperCase()} Files`, extensions: [extension] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (!result.canceled) {
            try {
                await fs.writeFile(result.filePath, data);
                return {
                    success: true,
                    filePath: result.filePath
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return { success: false, cancelled: true };
    });

    // ✅ ADD: PDF modification with form fields IPC handler
    ipcMain.handle('modify-pdf-with-fields', async (event, originalPdfBuffer, formFields) => {
        console.log('=== Main Process PDF Modification Started ===');
        console.log('Original PDF buffer size:', originalPdfBuffer.length);
        console.log('Form fields to add:', formFields.length);
        console.log('pdf-lib available:', !!PDFLib);

        // Check if pdf-lib is available
        if (!PDFLib) {
            console.warn('pdf-lib not available in main process - returning original PDF');
            return {
                success: false,
                error: 'pdf-lib not available',
                buffer: originalPdfBuffer
            };
        }

        // Validate inputs
        if (!originalPdfBuffer || originalPdfBuffer.length === 0) {
            return {
                success: false,
                error: 'Invalid PDF buffer',
                buffer: originalPdfBuffer
            };
        }

        if (!formFields || formFields.length === 0) {
            console.log('No form fields to add - returning original PDF');
            return {
                success: true,
                buffer: originalPdfBuffer,
                message: 'No form fields to add'
            };
        }

        try {
            // Convert array buffer to Buffer if needed
            let pdfBuffer;
            if (Array.isArray(originalPdfBuffer)) {
                pdfBuffer = Buffer.from(originalPdfBuffer);
            } else if (originalPdfBuffer instanceof ArrayBuffer) {
                pdfBuffer = Buffer.from(originalPdfBuffer);
            } else {
                pdfBuffer = originalPdfBuffer;
            }

            console.log('Loading PDF with pdf-lib...');
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
            console.log('PDF loaded successfully');

            const form = pdfDoc.getForm();
            const pages = pdfDoc.getPages();
            console.log('PDF has', pages.length, 'pages');

            let successfulFields = 0;
            let failedFields = 0;

            // Process each form field
            for (const fieldData of formFields) {
                try {
                    console.log(`Adding field: ${fieldData.name} (${fieldData.type})`);
                    
                    // Get the target page
                    const page = pages[fieldData.pageNumber - 1];
                    if (!page) {
                        throw new Error(`Page ${fieldData.pageNumber} not found`);
                    }

                    // Get page dimensions
                    const { width: pageWidth, height: pageHeight } = page.getSize();
                    
                    // Convert coordinates (PDF.js uses top-left, pdf-lib uses bottom-left)
                    const x = fieldData.x;
                    const y = pageHeight - fieldData.y - fieldData.height;
                    const width = fieldData.width;
                    const height = fieldData.height;

                    // Create form field based on type
                    switch (fieldData.type) {
                        case 'text':
                            const textField = form.createTextField(fieldData.name);
                            textField.setText(fieldData.value || '');
                            textField.setFontSize(12);
                            textField.addToPage(page, { x, y, width, height });
                            
                            if (fieldData.required) textField.markAsRequired();
                            if (fieldData.readonly) textField.markAsReadOnly();
                            break;

                        case 'checkbox':
                            const checkboxField = form.createCheckBox(fieldData.name);
                            if (fieldData.value === true || fieldData.value === 'true') {
                                checkboxField.check();
                            }
                            checkboxField.addToPage(page, { x, y, width, height });
                            
                            if (fieldData.required) checkboxField.markAsRequired();
                            if (fieldData.readonly) checkboxField.markAsReadOnly();
                            break;

                        case 'dropdown':
                            const options = fieldData.options || ['Option 1', 'Option 2', 'Option 3'];
                            const dropdownField = form.createDropdown(fieldData.name);
                            dropdownField.setOptions(options);
                            if (fieldData.value && options.includes(fieldData.value)) {
                                dropdownField.select(fieldData.value);
                            }
                            dropdownField.addToPage(page, { x, y, width, height });
                            
                            if (fieldData.required) dropdownField.markAsRequired();
                            if (fieldData.readonly) dropdownField.markAsReadOnly();
                            break;

                        case 'signature':
                            const signatureField = form.createTextField(fieldData.name);
                            signatureField.setText(fieldData.value || '');
                            signatureField.setFontSize(14);
                            signatureField.setBorderWidth(2);
                            signatureField.addToPage(page, { x, y, width, height });
                            
                            if (fieldData.required) signatureField.markAsRequired();
                            break;

                        default:
                            throw new Error(`Unsupported field type: ${fieldData.type}`);
                    }

                    successfulFields++;
                    console.log(`Successfully added field: ${fieldData.name}`);

                } catch (fieldError) {
                    failedFields++;
                    console.error(`Failed to add field ${fieldData.name}:`, fieldError.message);
                }
            }

            console.log(`Field processing complete: ${successfulFields} successful, ${failedFields} failed`);

            // Save the modified PDF
            console.log('Saving modified PDF...');
            const modifiedPdfBytes = await pdfDoc.save();
            console.log('Modified PDF saved, size:', modifiedPdfBytes.length);

            // Convert back to array for IPC transfer
            const transferableBuffer = Array.from(modifiedPdfBytes);

            console.log('=== Main Process PDF Modification Completed Successfully ===');
            
            return {
                success: true,
                buffer: transferableBuffer,
                message: `PDF modified with ${successfulFields} form fields`,
                stats: {
                    successfulFields,
                    failedFields,
                    totalFields: formFields.length
                }
            };

        } catch (error) {
            console.error('=== Main Process PDF Modification Failed ===');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            
            // Return original PDF as fallback
            return {
                success: false,
                error: error.message,
                buffer: originalPdfBuffer
            };
        }
    });

    // Theme handling
    ipcMain.handle('get-theme', () => {
        return nativeTheme.shouldUseDarkColors;
    });

    ipcMain.handle('set-theme', (event, theme) => {
        nativeTheme.themeSource = theme;
    });

    // App info
    ipcMain.handle('get-app-info', () => {
        return {
            name: app.getName(),
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch,
            isDevMode: isDevMode
        };
    });
}

/**
 * App event handlers
 */
app.whenReady().then(() => {
    createMainWindow();
    createMenu();
    setupIPC();
    
    // Handle activation (macOS)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // In production, you should implement proper certificate validation
    if (isDevMode) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

// Accessibility: Announce app startup
app.on('ready', () => {
    console.log('AccessiblePDF Editor started successfully');
});

// Handle protocol for deep linking (future feature)
app.setAsDefaultProtocolClient('accessible-pdf-editor');

// Export for testing
module.exports = { createMainWindow, createMenu, setupIPC }; 