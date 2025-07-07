/**
 * Checkbox State Detector - AccessiblePDF Editor
 * Analyzes PDF graphics and pixel data to detect checkbox states
 * Designed specifically for accurate form field state detection
 */

class CheckboxStateDetector {
    constructor(pdfProcessor) {
        this.pdfProcessor = pdfProcessor;
        this.debugMode = true;
        this.detectionThreshold = 0.7; // 70% confidence threshold
        
        // Pattern recognition data
        this.checkPatterns = {
            checkmark: ['✓', '✔', '√', 'X', 'x'],
            filled: ['█', '■', '●', '◆'],
            unicode: ['\u2713', '\u2714', '\u221A', '\u00D7']
        };
        
        console.log('Checkbox State Detector initialized');
    }
    
    /**
     * Detect checkbox states for all checkbox elements
     */
    async detectCheckboxStates(elements) {
        const checkboxElements = elements.filter(el => 
            el.type === 'checkbox' || 
            el.isCheckbox || 
            this.isLikelyCheckbox(el)
        );
        
        console.log(`Detecting states for ${checkboxElements.length} checkboxes`);
        
        for (const element of checkboxElements) {
            try {
                element.isChecked = await this.detectCheckboxState(element);
                element.confidence = this.lastDetectionConfidence;
                
                if (this.debugMode) {
                    console.log(`Checkbox ${element.id}: ${element.isChecked ? 'CHECKED' : 'UNCHECKED'} (confidence: ${element.confidence})`);
                }
            } catch (error) {
                console.warn(`Failed to detect state for checkbox ${element.id}:`, error);
                element.isChecked = false;
                element.confidence = 0;
            }
        }
        
        return checkboxElements;
    }
    
    /**
     * Detect the state of a specific checkbox element
     */
    async detectCheckboxState(element) {
        const detectionMethods = [
            () => this.detectByTextContent(element),
            () => this.detectByPixelAnalysis(element),
            () => this.detectByPathAnalysis(element),
            () => this.detectByFormFieldState(element),
            () => this.detectByVisualPatterns(element)
        ];
        
        const results = [];
        
        for (const method of detectionMethods) {
            try {
                const result = await method();
                if (result !== null) {
                    results.push(result);
                }
            } catch (error) {
                console.warn('Detection method failed:', error);
            }
        }
        
        // Combine results using weighted average
        return this.combineDetectionResults(results);
    }
    
    /**
     * Detect checkbox state by analyzing text content
     */
    async detectByTextContent(element) {
        // Check if there's text content that indicates a checked state
        const textContent = await this.getElementTextContent(element);
        
        if (!textContent) return null;
        
        // Check for common checkmark patterns
        const hasCheckmark = this.checkPatterns.checkmark.some(pattern => 
            textContent.includes(pattern)
        );
        
        const hasFilled = this.checkPatterns.filled.some(pattern => 
            textContent.includes(pattern)
        );
        
        const hasUnicode = this.checkPatterns.unicode.some(pattern => 
            textContent.includes(pattern)
        );
        
        if (hasCheckmark || hasFilled || hasUnicode) {
            this.lastDetectionConfidence = 0.9;
            return true;
        }
        
        // Check for common "checked" text indicators
        const checkedIndicators = ['yes', 'true', 'selected', 'on', '1'];
        const isCheckedText = checkedIndicators.some(indicator => 
            textContent.toLowerCase().includes(indicator)
        );
        
        if (isCheckedText) {
            this.lastDetectionConfidence = 0.6;
            return true;
        }
        
        return null;
    }
    
    /**
     * Detect checkbox state by analyzing pixel data
     */
    async detectByPixelAnalysis(element) {
        try {
            const canvas = await this.renderElementToCanvas(element);
            if (!canvas) return null;
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const analysis = this.analyzePixelData(imageData);
            
            // A checked checkbox typically has more filled pixels
            const fillRatio = analysis.filledPixels / analysis.totalPixels;
            const isDarkEnough = analysis.averageBrightness < 128;
            
            if (fillRatio > 0.3 && isDarkEnough) {
                this.lastDetectionConfidence = 0.8;
                return true;
            }
            
            if (fillRatio < 0.1) {
                this.lastDetectionConfidence = 0.7;
                return false;
            }
            
            return null;
            
        } catch (error) {
            console.warn('Pixel analysis failed:', error);
            return null;
        }
    }
    
    /**
     * Detect checkbox state by analyzing PDF path data
     */
    async detectByPathAnalysis(element) {
        try {
            const page = await this.pdfProcessor.currentDocument.getPage(element.pageNumber);
            const operatorList = await page.getOperatorList();
            
            const paths = this.extractPathsInRegion(operatorList, element);
            
            // Look for checkmark-like paths
            const hasCheckmarkPath = paths.some(path => 
                this.isCheckmarkPath(path)
            );
            
            if (hasCheckmarkPath) {
                this.lastDetectionConfidence = 0.85;
                return true;
            }
            
            // Look for filled rectangles
            const hasFilledRect = paths.some(path => 
                this.isFilledRectangle(path, element)
            );
            
            if (hasFilledRect) {
                this.lastDetectionConfidence = 0.75;
                return true;
            }
            
            return null;
            
        } catch (error) {
            console.warn('Path analysis failed:', error);
            return null;
        }
    }
    
    /**
     * Detect checkbox state from existing form field data
     */
    async detectByFormFieldState(element) {
        if (element.fieldName && element.value !== undefined) {
            const value = element.value;
            
            // Check common form field values for checked state
            const checkedValues = ['on', 'yes', 'true', '1', 'checked', 'selected'];
            const isChecked = checkedValues.includes(String(value).toLowerCase());
            
            if (isChecked) {
                this.lastDetectionConfidence = 0.95;
                return true;
            }
            
            const uncheckedValues = ['off', 'no', 'false', '0', '', 'unchecked'];
            const isUnchecked = uncheckedValues.includes(String(value).toLowerCase());
            
            if (isUnchecked) {
                this.lastDetectionConfidence = 0.95;
                return false;
            }
        }
        
        return null;
    }
    
    /**
     * Detect checkbox state by analyzing visual patterns
     */
    async detectByVisualPatterns(element) {
        try {
            const canvas = await this.renderElementToCanvas(element);
            if (!canvas) return null;
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Look for common checkbox patterns
            const patterns = [
                this.detectCheckmarkPattern(imageData),
                this.detectXPattern(imageData),
                this.detectFilledPattern(imageData),
                this.detectDotPattern(imageData)
            ];
            
            const detectedPatterns = patterns.filter(p => p.detected);
            
            if (detectedPatterns.length > 0) {
                const maxConfidence = Math.max(...detectedPatterns.map(p => p.confidence));
                this.lastDetectionConfidence = maxConfidence;
                return true;
            }
            
            return null;
            
        } catch (error) {
            console.warn('Visual pattern analysis failed:', error);
            return null;
        }
    }
    
    /**
     * Get text content for an element
     */
    async getElementTextContent(element) {
        try {
            const page = await this.pdfProcessor.currentDocument.getPage(element.pageNumber);
            const textContent = await page.getTextContent();
            
            // Find text items that overlap with the element
            const overlappingText = textContent.items.filter(item => {
                const itemBounds = {
                    left: item.transform[4],
                    top: item.transform[5],
                    right: item.transform[4] + item.width,
                    bottom: item.transform[5] + item.height
                };
                
                return this.boundsOverlap(element.bounds, itemBounds);
            });
            
            return overlappingText.map(item => item.str).join(' ');
            
        } catch (error) {
            console.warn('Failed to get element text content:', error);
            return '';
        }
    }
    
    /**
     * Render element to canvas for pixel analysis
     */
    async renderElementToCanvas(element) {
        try {
            const page = await this.pdfProcessor.currentDocument.getPage(element.pageNumber);
            const scale = 2.0; // Higher scale for better analysis
            const viewport = page.getViewport({ scale });
            
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(element.width * scale);
            canvas.height = Math.ceil(element.height * scale);
            
            const ctx = canvas.getContext('2d');
            
            // Render page
            await page.render({
                canvasContext: ctx,
                viewport: viewport,
                // Crop to element bounds
                transform: [scale, 0, 0, scale, -element.x * scale, -element.y * scale]
            }).promise;
            
            return canvas;
            
        } catch (error) {
            console.warn('Failed to render element to canvas:', error);
            return null;
        }
    }
    
    /**
     * Analyze pixel data to extract statistics
     */
    analyzePixelData(imageData) {
        const data = imageData.data;
        const totalPixels = imageData.width * imageData.height;
        let filledPixels = 0;
        let brightnessSum = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Calculate brightness
            const brightness = (r + g + b) / 3;
            brightnessSum += brightness;
            
            // Count filled pixels (dark pixels with high opacity)
            if (brightness < 200 && a > 128) {
                filledPixels++;
            }
        }
        
        return {
            totalPixels,
            filledPixels,
            averageBrightness: brightnessSum / totalPixels,
            fillRatio: filledPixels / totalPixels
        };
    }
    
    /**
     * Extract paths from operator list in a specific region
     */
    extractPathsInRegion(operatorList, element) {
        const paths = [];
        const bounds = element.bounds;
        
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            const args = operatorList.argsArray[i];
            
            if (fn === this.pdfProcessor.pdfjsLib.OPS.constructPath) {
                const path = this.analyzePath(args, bounds);
                if (path) {
                    paths.push(path);
                }
            }
        }
        
        return paths;
    }
    
    /**
     * Analyze a path to determine if it's a checkmark
     */
    isCheckmarkPath(path) {
        // A checkmark typically has 2 line segments forming a "V" shape
        if (path.segments && path.segments.length >= 2) {
            const firstSegment = path.segments[0];
            const secondSegment = path.segments[1];
            
            // Check if it forms a downward then upward pattern
            const isCheckmarkPattern = 
                firstSegment.direction === 'down-right' && 
                secondSegment.direction === 'up-right';
                
            return isCheckmarkPattern;
        }
        
        return false;
    }
    
    /**
     * Check if path is a filled rectangle
     */
    isFilledRectangle(path, element) {
        if (path.type === 'rectangle') {
            const pathArea = path.width * path.height;
            const elementArea = element.width * element.height;
            
            // If path covers most of the element area, it's likely filled
            return pathArea / elementArea > 0.5;
        }
        
        return false;
    }
    
    /**
     * Detect checkmark pattern in pixel data
     */
    detectCheckmarkPattern(imageData) {
        // Simplified checkmark detection - look for diagonal lines
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        let checkmarkScore = 0;
        const threshold = 100; // Darkness threshold
        
        // Look for diagonal patterns
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const i = (y * width + x) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                
                if (brightness < threshold) {
                    // Check for diagonal connections
                    const rightDown = ((y + 1) * width + (x + 1)) * 4;
                    const rightDownBrightness = (data[rightDown] + data[rightDown + 1] + data[rightDown + 2]) / 3;
                    
                    if (rightDownBrightness < threshold) {
                        checkmarkScore++;
                    }
                }
            }
        }
        
        const confidence = Math.min(checkmarkScore / (width * height / 10), 1.0);
        
        return {
            detected: confidence > 0.3,
            confidence: confidence
        };
    }
    
    /**
     * Detect X pattern in pixel data
     */
    detectXPattern(imageData) {
        // Look for crossed diagonal lines
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        let xScore = 0;
        const threshold = 100;
        
        // Check both diagonals
        for (let i = 0; i < Math.min(width, height); i++) {
            // Main diagonal
            const mainDiag = (i * width + i) * 4;
            const mainBrightness = (data[mainDiag] + data[mainDiag + 1] + data[mainDiag + 2]) / 3;
            
            // Anti-diagonal
            const antiDiag = (i * width + (width - 1 - i)) * 4;
            const antiBrightness = (data[antiDiag] + data[antiDiag + 1] + data[antiDiag + 2]) / 3;
            
            if (mainBrightness < threshold) xScore++;
            if (antiBrightness < threshold) xScore++;
        }
        
        const confidence = xScore / (Math.min(width, height) * 2);
        
        return {
            detected: confidence > 0.5,
            confidence: confidence
        };
    }
    
    /**
     * Detect filled pattern in pixel data
     */
    detectFilledPattern(imageData) {
        const analysis = this.analyzePixelData(imageData);
        
        const confidence = analysis.fillRatio;
        
        return {
            detected: confidence > 0.4,
            confidence: confidence
        };
    }
    
    /**
     * Detect dot pattern in pixel data
     */
    detectDotPattern(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // Look for concentrated dark area in center
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const radius = Math.min(width, height) / 4;
        
        let darkPixelsInCenter = 0;
        let totalPixelsInCenter = 0;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const i = (y * width + x) * 4;
                    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    
                    totalPixelsInCenter++;
                    if (brightness < 128) {
                        darkPixelsInCenter++;
                    }
                }
            }
        }
        
        const confidence = darkPixelsInCenter / totalPixelsInCenter;
        
        return {
            detected: confidence > 0.6,
            confidence: confidence
        };
    }
    
    /**
     * Analyze path operations
     */
    analyzePath(args, bounds) {
        // Simplified path analysis
        return {
            type: 'path',
            segments: [],
            bounds: bounds
        };
    }
    
    /**
     * Check if two bounds overlap
     */
    boundsOverlap(bounds1, bounds2) {
        return !(bounds1.right < bounds2.left || 
                bounds2.right < bounds1.left || 
                bounds1.bottom < bounds2.top || 
                bounds2.bottom < bounds1.top);
    }
    
    /**
     * Combine multiple detection results
     */
    combineDetectionResults(results) {
        if (results.length === 0) return false;
        
        const checkedResults = results.filter(r => r === true);
        const uncheckedResults = results.filter(r => r === false);
        
        // If majority says checked, return checked
        if (checkedResults.length > uncheckedResults.length) {
            return true;
        }
        
        // If majority says unchecked, return unchecked
        if (uncheckedResults.length > checkedResults.length) {
            return false;
        }
        
        // If tied, prefer unchecked (safer default)
        return false;
    }
    
    /**
     * Check if element is likely a checkbox
     */
    isLikelyCheckbox(element) {
        // Small square shapes are likely checkboxes
        const isSquare = Math.abs(element.width - element.height) < 5;
        const isSmall = element.width < 30 && element.height < 30;
        const isLargeEnough = element.width > 8 && element.height > 8;
        
        return isSquare && isSmall && isLargeEnough;
    }
    
    /**
     * Get detection statistics
     */
    getDetectionStatistics() {
        return {
            threshold: this.detectionThreshold,
            patterns: this.checkPatterns,
            debugMode: this.debugMode
        };
    }
    
    /**
     * Update detection settings
     */
    updateSettings(settings) {
        if (settings.threshold !== undefined) {
            this.detectionThreshold = settings.threshold;
        }
        
        if (settings.debugMode !== undefined) {
            this.debugMode = settings.debugMode;
        }
        
        if (settings.patterns) {
            this.checkPatterns = { ...this.checkPatterns, ...settings.patterns };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheckboxStateDetector;
} else {
    window.CheckboxStateDetector = CheckboxStateDetector;
} 