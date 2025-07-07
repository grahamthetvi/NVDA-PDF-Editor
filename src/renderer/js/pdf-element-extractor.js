/**
 * PDF Element Extractor - AccessiblePDF Editor
 * Extracts all PDF elements with coordinates and sorts by reading order
 * Designed specifically for NVDA screen reader compatibility
 */

class PDFElementExtractor {
    constructor(pdfProcessor) {
        this.pdfProcessor = pdfProcessor;
        this.elements = [];
        this.debugMode = true;
        
        console.log('PDF Element Extractor initialized');
    }
    
    /**
     * Extract all elements from the current PDF document
     */
    async extractAllElements() {
        if (!this.pdfProcessor || !this.pdfProcessor.currentDocument) {
            throw new Error('No PDF document loaded');
        }
        
        const document = this.pdfProcessor.currentDocument;
        const numPages = document.numPages;
        
        console.log(`Extracting elements from ${numPages} pages...`);
        
        this.elements = [];
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const pageElements = await this.extractPageElements(pageNum);
            this.elements.push(...pageElements);
        }
        
        // Sort elements by reading order
        this.sortElementsByReadingOrder();
        
        console.log(`Extracted ${this.elements.length} elements total`);
        return this.elements;
    }
    
    /**
     * Extract elements from a specific page
     */
    async extractPageElements(pageNumber) {
        const page = await this.pdfProcessor.currentDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.0 });
        
        const pageElements = [];
        
        // Extract text elements
        const textElements = await this.extractTextElements(page, pageNumber, viewport);
        pageElements.push(...textElements);
        
        // Extract form field elements
        const formElements = await this.extractFormElements(page, pageNumber, viewport);
        pageElements.push(...formElements);
        
        // Extract graphic elements (potential checkboxes, signatures, etc.)
        const graphicElements = await this.extractGraphicElements(page, pageNumber, viewport);
        pageElements.push(...graphicElements);
        
        console.log(`Page ${pageNumber}: ${pageElements.length} elements extracted`);
        return pageElements;
    }
    
    /**
     * Extract text elements with coordinates and enhanced analysis
     */
    async extractTextElements(page, pageNumber, viewport) {
        const textContent = await page.getTextContent();
        const textElements = [];
        
        for (let index = 0; index < textContent.items.length; index++) {
            const item = textContent.items[index];
            
            // Transform coordinates to viewport
            const transform = item.transform;
            const x = transform[4];
            const y = viewport.height - transform[5]; // Convert to top-left origin
            
            const element = {
                id: `text_${pageNumber}_${textElements.length}`,
                type: 'text',
                pageNumber: pageNumber,
                text: item.str,
                x: x,
                y: y,
                width: item.width,
                height: item.height,
                fontSize: item.height,
                fontFamily: item.fontName,
                isEditable: this.isTextEditable(item),
                bounds: {
                    left: x,
                    top: y,
                    right: x + item.width,
                    bottom: y + item.height
                },
                
                // Enhanced properties for unstructured text detection
                transform: transform,
                isWhitespace: /^\s*$/.test(item.str),
                wordCount: item.str.split(/\s+/).filter(word => word.length > 0).length,
                hasLetters: /[a-zA-Z]/.test(item.str),
                hasPunctuation: /[.!?,:;]/.test(item.str),
                isNumeric: /^\d+$/.test(item.str.trim()),
                
                // Context for better detection
                nextItem: textContent.items[index + 1],
                prevItem: textContent.items[index - 1]
            };
            
            // Determine if this is likely unstructured text
            element.isLikelyUnstructured = this.analyzeForUnstructuredText(element, textContent.items, index);
            
            textElements.push(element);
        }
        
        // Group nearby text elements to reduce fragmentation
        const groupedElements = this.groupNearbyTextElements(textElements);
        
        console.log(`Page ${pageNumber}: ${groupedElements.length} text elements (${textElements.length} original)`);
        return groupedElements;
    }
    
    /**
     * Analyze if text element is likely unstructured content
     */
    analyzeForUnstructuredText(element, allItems, currentIndex) {
        // Skip whitespace and very short text
        if (element.isWhitespace || element.text.length < 3) {
            return false;
        }
        
        // Multi-word content is likely unstructured
        if (element.wordCount > 3) {
            return true;
        }
        
        // Text with punctuation suggests sentences
        if (element.hasPunctuation && element.wordCount > 1) {
            return true;
        }
        
        // Large text areas
        if (element.width > 200 && element.height > 15) {
            return true;
        }
        
        // Check context - if surrounded by similar text, likely unstructured
        const contextRadius = 3;
        const startIndex = Math.max(0, currentIndex - contextRadius);
        const endIndex = Math.min(allItems.length, currentIndex + contextRadius + 1);
        const context = allItems.slice(startIndex, endIndex);
        
        const contextualTextItems = context.filter(item => 
            item.str.length > 3 && /[a-zA-Z]/.test(item.str)
        );
        
        if (contextualTextItems.length >= 3) {
            return true;
        }
        
        // Check for paragraph-like structures
        if (element.hasLetters && element.text.length > 20) {
            return true;
        }
        
        // Check for sentence patterns
        if (/^[A-Z]/.test(element.text) && element.text.length > 10) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Extract form field elements
     */
    async extractFormElements(page, pageNumber, viewport) {
        const annotations = await page.getAnnotations();
        const formElements = [];
        
        for (const annotation of annotations) {
            if (annotation.subtype === 'Widget') {
                const rect = annotation.rect;
                const x = rect[0];
                const y = viewport.height - rect[3]; // Convert to top-left origin
                const width = rect[2] - rect[0];
                const height = rect[3] - rect[1];
                
                const element = {
                    id: `form_${pageNumber}_${formElements.length}`,
                    type: this.getFormFieldType(annotation),
                    pageNumber: pageNumber,
                    text: annotation.fieldName || annotation.alternativeText || '',
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    value: annotation.fieldValue || '',
                    fieldName: annotation.fieldName,
                    isRequired: annotation.required || false,
                    isReadOnly: annotation.readOnly || false,
                    bounds: {
                        left: x,
                        top: y,
                        right: x + width,
                        bottom: y + height
                    }
                };
                
                formElements.push(element);
            }
        }
        
        console.log(`Page ${pageNumber}: ${formElements.length} form elements`);
        return formElements;
    }
    
    /**
     * Extract graphic elements (potential checkboxes, signatures, etc.)
     */
    async extractGraphicElements(page, pageNumber, viewport) {
        const graphicElements = [];
        
        try {
            // Get page content operations
            const operatorList = await page.getOperatorList();
            const shapes = this.analyzeShapes(operatorList.argsArray, operatorList.fnArray, viewport);
            
            for (const shape of shapes) {
                const element = {
                    id: `graphic_${pageNumber}_${graphicElements.length}`,
                    type: this.classifyShape(shape),
                    pageNumber: pageNumber,
                    text: '',
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height,
                    shape: shape.shapeType,
                    isCheckbox: this.isLikelyCheckbox(shape),
                    isSignatureArea: this.isLikelySignatureArea(shape),
                    bounds: {
                        left: shape.x,
                        top: shape.y,
                        right: shape.x + shape.width,
                        bottom: shape.y + shape.height
                    }
                };
                
                graphicElements.push(element);
            }
            
        } catch (error) {
            console.warn(`Could not extract graphics from page ${pageNumber}:`, error);
        }
        
        console.log(`Page ${pageNumber}: ${graphicElements.length} graphic elements`);
        return graphicElements;
    }
    
    /**
     * Analyze shapes from PDF operations
     */
    analyzeShapes(argsArray, fnArray, viewport) {
        const shapes = [];
        let currentTransform = [1, 0, 0, 1, 0, 0];
        
        for (let i = 0; i < fnArray.length; i++) {
            const fn = fnArray[i];
            const args = argsArray[i];
            
            switch (fn) {
                case this.pdfProcessor.pdfjsLib.OPS.rectangle:
                    if (args.length >= 4) {
                        const x = args[0];
                        const y = viewport.height - args[1] - args[3]; // Convert to top-left origin
                        const width = args[2];
                        const height = args[3];
                        
                        shapes.push({
                            shapeType: 'rectangle',
                            x: x,
                            y: y,
                            width: width,
                            height: height,
                            transform: currentTransform
                        });
                    }
                    break;
                    
                case this.pdfProcessor.pdfjsLib.OPS.constructPath:
                    // Handle path construction for more complex shapes
                    const pathShape = this.analyzePath(args, viewport);
                    if (pathShape) {
                        shapes.push(pathShape);
                    }
                    break;
                    
                case this.pdfProcessor.pdfjsLib.OPS.transform:
                    // Update current transformation matrix
                    currentTransform = args;
                    break;
            }
        }
        
        return shapes;
    }
    
    /**
     * Analyze path operations for complex shapes
     */
    analyzePath(pathArgs, viewport) {
        // Simple path analysis - can be enhanced for more complex shapes
        if (pathArgs.length >= 4) {
            const x = pathArgs[0];
            const y = viewport.height - pathArgs[1]; // Convert to top-left origin
            const width = Math.abs(pathArgs[2] - pathArgs[0]);
            const height = Math.abs(pathArgs[3] - pathArgs[1]);
            
            return {
                shapeType: 'path',
                x: x,
                y: y,
                width: width,
                height: height
            };
        }
        
        return null;
    }
    
    /**
     * Group nearby text elements to reduce fragmentation
     */
    groupNearbyTextElements(textElements) {
        const grouped = [];
        const processed = new Set();
        
        for (let i = 0; i < textElements.length; i++) {
            if (processed.has(i)) continue;
            
            const element = textElements[i];
            const group = [element];
            processed.add(i);
            
            // Find nearby elements on the same line
            for (let j = i + 1; j < textElements.length; j++) {
                if (processed.has(j)) continue;
                
                const candidate = textElements[j];
                
                // Check if on same line and close horizontally
                if (Math.abs(candidate.y - element.y) < element.height * 0.5 &&
                    Math.abs(candidate.x - (element.x + element.width)) < element.width * 0.1) {
                    group.push(candidate);
                    processed.add(j);
                }
            }
            
            // Create grouped element
            if (group.length > 1) {
                const groupedElement = this.createGroupedTextElement(group);
                grouped.push(groupedElement);
            } else {
                grouped.push(element);
            }
        }
        
        return grouped;
    }
    
    /**
     * Create a grouped text element from multiple text items
     */
    createGroupedTextElement(textItems) {
        const first = textItems[0];
        const last = textItems[textItems.length - 1];
        
        return {
            id: `grouped_${first.id}`,
            type: 'text',
            pageNumber: first.pageNumber,
            text: textItems.map(item => item.text).join(' '),
            x: first.x,
            y: first.y,
            width: (last.x + last.width) - first.x,
            height: Math.max(...textItems.map(item => item.height)),
            fontSize: first.fontSize,
            fontFamily: first.fontFamily,
            isEditable: textItems.some(item => item.isEditable),
            bounds: {
                left: first.x,
                top: first.y,
                right: last.x + last.width,
                bottom: first.y + Math.max(...textItems.map(item => item.height))
            },
            groupedItems: textItems
        };
    }
    
    /**
     * Sort elements by reading order (Y-coordinate first, then X-coordinate)
     */
    sortElementsByReadingOrder() {
        this.elements.sort((a, b) => {
            // First sort by page number
            if (a.pageNumber !== b.pageNumber) {
                return a.pageNumber - b.pageNumber;
            }
            
            // Then by Y-coordinate (top to bottom)
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > 5) { // 5px tolerance for same line
                return yDiff;
            }
            
            // Finally by X-coordinate (left to right)
            return a.x - b.x;
        });
        
        // Assign reading order indices
        this.elements.forEach((element, index) => {
            element.readingOrder = index + 1;
        });
    }
    
    /**
     * Determine if text is editable (usually forms or empty areas)
     */
    isTextEditable(textItem) {
        // Check if text appears to be a form field placeholder
        const text = textItem.str.trim();
        const formIndicators = ['___', '...', '____________', 'Enter', 'Type', 'Fill'];
        
        return formIndicators.some(indicator => text.includes(indicator));
    }
    
    /**
     * Get form field type from annotation
     */
    getFormFieldType(annotation) {
        if (annotation.checkBox) return 'checkbox';
        if (annotation.radioButton) return 'radio';
        if (annotation.combo) return 'dropdown';
        if (annotation.multiLine) return 'textarea';
        return 'text';
    }
    
    /**
     * Classify shape type based on dimensions and characteristics
     */
    classifyShape(shape) {
        if (this.isLikelyCheckbox(shape)) return 'checkbox';
        if (this.isLikelySignatureArea(shape)) return 'signature';
        if (this.isLikelyTextField(shape)) return 'text';
        return 'graphic';
    }
    
    /**
     * Determine if shape is likely a checkbox
     */
    isLikelyCheckbox(shape) {
        // Small square shapes are likely checkboxes
        const isSquare = Math.abs(shape.width - shape.height) < 5;
        const isSmall = shape.width < 30 && shape.height < 30;
        const isLargeEnough = shape.width > 8 && shape.height > 8;
        
        return isSquare && isSmall && isLargeEnough;
    }
    
    /**
     * Determine if shape is likely a signature area
     */
    isLikelySignatureArea(shape) {
        // Wide, short rectangles are likely signature areas
        const isWide = shape.width > 100;
        const isShort = shape.height > 15 && shape.height < 40;
        const aspectRatio = shape.width / shape.height;
        
        return isWide && isShort && aspectRatio > 3;
    }
    
    /**
     * Determine if shape is likely a text field
     */
    isLikelyTextField(shape) {
        // Medium-sized rectangles are likely text fields
        const isReasonableSize = shape.width > 50 && shape.width < 300;
        const isTextHeight = shape.height > 15 && shape.height < 50;
        
        return isReasonableSize && isTextHeight;
    }
    
    /**
     * Get elements by type
     */
    getElementsByType(type) {
        return this.elements.filter(element => element.type === type);
    }
    
    /**
     * Get elements by page
     */
    getElementsByPage(pageNumber) {
        return this.elements.filter(element => element.pageNumber === pageNumber);
    }
    
    /**
     * Get element by ID
     */
    getElementById(id) {
        return this.elements.find(element => element.id === id);
    }
    
    /**
     * Get all elements in reading order
     */
    getAllElements() {
        return [...this.elements];
    }
    
    /**
     * Get statistics about extracted elements
     */
    getStatistics() {
        const stats = {
            total: this.elements.length,
            byType: {},
            byPage: {},
            unstructuredText: {
                total: 0,
                byPage: {}
            }
        };
        
        this.elements.forEach(element => {
            // Count by type
            stats.byType[element.type] = (stats.byType[element.type] || 0) + 1;
            
            // Count by page
            stats.byPage[element.pageNumber] = (stats.byPage[element.pageNumber] || 0) + 1;
            
            // Count unstructured text elements
            if (element.isLikelyUnstructured) {
                stats.unstructuredText.total++;
                
                if (!stats.unstructuredText.byPage[element.pageNumber]) {
                    stats.unstructuredText.byPage[element.pageNumber] = 0;
                }
                stats.unstructuredText.byPage[element.pageNumber]++;
            }
        });
        
        return stats;
    }
    
    /**
     * Clear all extracted elements
     */
    clear() {
        this.elements = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFElementExtractor;
} else {
    window.PDFElementExtractor = PDFElementExtractor;
} 