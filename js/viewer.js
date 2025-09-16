// js/viewer.js - Complete PDF viewer with mobile responsive design
import { AppState } from './state.js';
import { EyeProtectionManager } from './eyeProtection.js';
import { ThemeManager } from './theme.js';

// Configure PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Safe element removal utility
function safeRemoveElement(element) {
    try {
        if (element) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
                return true;
            } else if (element && element.remove) {
                element.remove();
                return true;
            }
        }
    } catch (error) {
        console.warn('Error removing element:', error);
    }
    return false;
}

class ViewerApp {
    constructor() {
        this.state = new AppState();
        this.pdfDoc = null;
        this.currentPage = 1;
        this.zoom = 1.0;
        this.totalPages = 0;
        this.filename = '';
        
        // Define zoom levels for 5% increments
        this.zoomLevels = [
            0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95,
            1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50, 1.55, 1.60, 1.65, 1.70,
            1.75, 1.80, 1.85, 1.90, 1.95, 2.00, 2.10, 2.20, 2.30, 2.40, 2.50, 2.60, 2.70, 2.80, 2.90, 3.00
        ];
        this.currentZoomIndex = this.zoomLevels.indexOf(1.0);
        
        this.isMobile = window.innerWidth <= 768;
        this.mobilePages = [];
        this.handleTOCClick = null;
        this.handleMobileScroll = null;
        this.handleFullscreenClick = null;
        
        this.init();
    }
    
    init() {
        // Get PDF filename from URL
        const params = new URLSearchParams(window.location.search);
        this.filename = params.get('pdf');
        
        if (!this.filename) {
            alert('No PDF specified');
            window.location.href = 'index.html';
            return;
        }
        
        this.themeManager = new ThemeManager(this.state);
        this.eyeProtection = new EyeProtectionManager(this.state);
        
        this.bindEvents();
        this.loadPDF();
        
        // Handle viewport changes
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            if (wasMobile !== this.isMobile) {
                this.handleViewportChange();
            }
        });
        
        // ADDED: Handle fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('msfullscreenchange', () => this.handleFullscreenChange());
        
        if (this.isMobile) {
            this.setupMobileViewer();
        }
    }

    // ADDED: Handle fullscreen state changes
    handleFullscreenChange() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (!fullscreenBtn) return;
        
        const isFullscreen = !!(
            document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement
        );
        
        if (isFullscreen) {
            fullscreenBtn.innerHTML = '✖';
            fullscreenBtn.title = 'Exit Fullscreen';
        } else {
            fullscreenBtn.innerHTML = '⛶';
            fullscreenBtn.title = 'Enter Fullscreen';
        }
    }
    
    setupMobileViewer() {
        if (!this.isMobile) return;
        
        try {
            this.createMobileViewerHTML();
            this.createMobileHeader();
            this.bindMobileEvents();
        } catch (error) {
            console.error('Error setting up mobile viewer:', error);
        }
    }

    // Add this new method to your ViewerApp class
    createMobileHeader() {
        // Transform the existing header for mobile
        const readingHeader = document.querySelector('.reading-header');
        if (!readingHeader) return;
        
        // Add mobile header class
        readingHeader.classList.add('mobile-reading-header');
        
        const toolbar = document.querySelector('.reading-toolbar');
        if (!toolbar) return;
        
        // Create two-level mobile header structure
        toolbar.innerHTML = `
            <!-- First Level: Back button and title -->
            <div class="mobile-header-level-1">
                <a href="index.html" class="btn--outline btn btn--ghost btn--round btn--floating">❮❮</a>
                <span class="pdf-title mobile-pdf-title" id="currentPdfTitle">Loading...</span>
            </div>
            
            <!-- Second Level: Action buttons -->
            <div class="mobile-header-level-2">
                <div class="mobile-controls-group">
                    <div class="mobile-theme-controls">
                        <label class="mobile-theme-toggle">
                            <input type="checkbox" id="themeToggle" ${this.state.state.darkMode ? 'checked' : ''}>
                            <span class="mobile-theme-slider">🌙</span>
                        </label>
                    </div>
                    
                    <div class="mobile-eye-protection">
                        <button class="btn--sm btn--ghost mobile-eye-btn ${this.state.state.eyeProtectionEnabled ? 'active' : ''}" id="eyeProtectionToggle">👁️</button>
                    </div>
                    
                    <button class="btn--sm btn--ghost mobile-toc-btn" id="toggleTOC" type="button">📋</button>
                    <button class="btn--sm btn--ghost mobile-fullscreen-btn" id="fullscreenBtn" type="button">⛶</button>
                </div>
            </div>
        `;
        
        // IMPORTANT: Re-bind mobile events after DOM changes
        setTimeout(() => {
            this.bindMobileEvents();
        }, 100);
        
        // Re-initialize theme and eye protection managers to bind to new elements
        this.themeManager = new ThemeManager(this.state);
        this.eyeProtection = new EyeProtectionManager(this.state);
    }

    createMobileViewerHTML() {
        const readingContainer = document.querySelector('.reading-container');
        if (!readingContainer) {
            console.warn('Reading container not found');
            return;
        }
        
        // Remove existing mobile viewer if it exists
        safeRemoveElement('#mobilePdfViewer');
        
        // Create mobile viewer HTML
        const mobileViewer = document.createElement('div');
        mobileViewer.className = 'mobile-pdf-viewer';
        mobileViewer.id = 'mobilePdfViewer';
        
        mobileViewer.innerHTML = `
            <div class="mobile-page-container" id="mobilePageContainer">
                <!-- Pages will be dynamically added here -->
            </div>
        `;
        
        // REMOVE THESE LINES - they'll be called in createMobileHeader()
        // this.themeManager = new ThemeManager(this.state);
        // this.eyeProtection = new EyeProtectionManager(this.state);
        
        readingContainer.appendChild(mobileViewer);
    }


    bindMobileEvents() {
        try {
            // TOC modal for mobile
            const tocBtn = document.getElementById('toggleTOC');
            if (tocBtn) {
                // Remove existing listener to prevent duplicates
                if (this.handleTOCClick) {
                    tocBtn.removeEventListener('click', this.handleTOCClick);
                }
                this.handleTOCClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showMobileTOC();
                };
                tocBtn.addEventListener('click', this.handleTOCClick);
            } else {
                console.warn('TOC button not found in mobile mode');
            }
            
            // Fullscreen button for mobile
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            if (fullscreenBtn) {
                // Remove existing listener to prevent duplicates
                if (this.handleFullscreenClick) {
                    fullscreenBtn.removeEventListener('click', this.handleFullscreenClick);
                }
                this.handleFullscreenClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleFullscreen();
                };
                fullscreenBtn.addEventListener('click', this.handleFullscreenClick);
            }
            
            // Handle mobile scroll
            const mobileViewer = document.getElementById('mobilePdfViewer');
            if (mobileViewer) {
                // Remove existing listeners
                if (this.handleMobileScroll) {
                    mobileViewer.removeEventListener('scroll', this.handleMobileScroll);
                }
                
                this.handleMobileScroll = () => this.updateMobileProgress();
                mobileViewer.addEventListener('scroll', this.handleMobileScroll);
            }
        } catch (error) {
            console.error('Error binding mobile events:', error);
        }
    }
    
    async renderMobilePages() {
        if (!this.pdfDoc || !this.isMobile) return;
        
        const container = document.getElementById('mobilePageContainer');
        if (!container) return;
        
        // Clear existing pages
        container.innerHTML = '';
        this.mobilePages = [];
        
        // PERFORMANCE FIX: Create placeholders for all pages (instant)
        // Only render pages that are visible or near visible
        this.createMobilePagePlaceholders(container);
        
        // Setup intersection observer for lazy loading
        this.setupMobileLazyLoading();
        
    }

    // NEW: Create lightweight placeholders
    createMobilePagePlaceholders(container) {
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'mobile-pdf-page';
            pageDiv.setAttribute('data-page', pageNum);
            pageDiv.setAttribute('id', `mobilePage${pageNum}Container`); // ADDED: Container ID
            
            // Lightweight placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'mobile-page-placeholder';
            placeholder.innerHTML = `
                <div class="page-placeholder-content">
                    <div class="placeholder-icon">📄</div>
                    <div class="placeholder-text">Page ${pageNum}</div>
                </div>
            `;
            
            const indicator = document.createElement('div');
            indicator.className = 'mobile-page-indicator';
            indicator.textContent = `Page ${pageNum} of ${this.totalPages}`;
            
            pageDiv.appendChild(placeholder);
            pageDiv.appendChild(indicator);
            container.appendChild(pageDiv);
        }
    }

    // NEW: Setup intersection observer for lazy loading
    setupMobileLazyLoading() {
        const options = {
            root: document.getElementById('mobilePdfViewer'),
            rootMargin: '200px', // Start loading 200px before coming into view
            threshold: 0.1
        };
        
        this.pageObserver = new IntersectionObserver(async (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const pageDiv = entry.target;
                    const pageNum = parseInt(pageDiv.getAttribute('data-page'));
                    
                    // Only render if not already rendered
                    if (!pageDiv.querySelector('canvas')) {
                        await this.renderSingleMobilePage(pageNum, pageDiv);
                    }
                    
                    // Stop observing this page
                    this.pageObserver.unobserve(pageDiv);
                }
            }
        }, options);
        
        // Start observing all page placeholders
        const pageElements = document.querySelectorAll('.mobile-pdf-page');
        pageElements.forEach(pageElement => {
            this.pageObserver.observe(pageElement);
        });
    }

    // NEW: Render single mobile page
    async renderSingleMobilePage(pageNum, pageDiv) {
        try {
            
            // Remove placeholder
            const placeholder = pageDiv.querySelector('.mobile-page-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
            
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.id = `mobilePage${pageNum}`;
            
            // Insert canvas before indicator
            const indicator = pageDiv.querySelector('.mobile-page-indicator');
            pageDiv.insertBefore(canvas, indicator);
            
            // Render page with optimized settings
            const page = await this.pdfDoc.getPage(pageNum);
            const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2 for performance
            
            const baseViewport = page.getViewport({ scale: 1 });
            const containerWidth = window.innerWidth - 32;
            const baseScale = Math.min(containerWidth / baseViewport.width, 1.5); // Reduced max scale
            
            const finalScale = baseScale * dpr;
            const viewport = page.getViewport({ scale: finalScale });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const displayWidth = baseViewport.width * baseScale;
            const displayHeight = baseViewport.height * baseScale;
            
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            
            const context = canvas.getContext('2d');
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            this.mobilePages[pageNum - 1] = canvas;
            
        } catch (error) {
            console.error(`Error rendering mobile page ${pageNum}:`, error);
            
            // Show error placeholder
            const errorDiv = document.createElement('div');
            errorDiv.className = 'mobile-page-error';
            errorDiv.innerHTML = `
                <div class="error-content">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">Failed to load page ${pageNum}</div>
                </div>
            `;
            pageDiv.appendChild(errorDiv);
        }
    }
    
    showMobileTOC() {
        // Check if modal already exists and remove it
        safeRemoveElement('.mobile-toc-modal');
        
        // Create mobile TOC modal
        const modal = document.createElement('div');
        modal.className = 'mobile-toc-modal';
        modal.innerHTML = `
            <div class="mobile-toc-content">
                <div class="mobile-toc-header">
                    <h3>Table of Contents</h3>
                    <button class="btn--ghost btn--sm" id="closeMobileTOC">✕</button>
                </div>
                <div id="mobileTocItems"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Populate TOC
        this.generateMobileTOC();
        
        // Close modal function
        const closeModal = () => {
            safeRemoveElement(modal);
        };
        
        // Close modal events
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        const closeBtn = document.getElementById('closeMobileTOC');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    // NEW: Render single mobile page with proper ID management
    async renderSingleMobilePage(pageNum, pageDiv) {
        try {
            
            // Remove placeholder
            const placeholder = pageDiv.querySelector('.mobile-page-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
            
            // Create canvas with consistent ID
            const canvas = document.createElement('canvas');
            canvas.id = `mobilePage${pageNum}`;
            canvas.setAttribute('data-page-num', pageNum); // ADDED: Extra data attribute
            
            // Insert canvas before indicator
            const indicator = pageDiv.querySelector('.mobile-page-indicator');
            pageDiv.insertBefore(canvas, indicator);
            
            // ADDED: Ensure the page div has proper data attribute
            pageDiv.setAttribute('data-page', pageNum);
            pageDiv.setAttribute('id', `mobilePage${pageNum}Container`);
            
            // Render page with optimized settings
            const page = await this.pdfDoc.getPage(pageNum);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            
            const baseViewport = page.getViewport({ scale: 1 });
            const containerWidth = window.innerWidth - 32;
            const baseScale = Math.min(containerWidth / baseViewport.width, 1.5);
            
            const finalScale = baseScale * dpr;
            const viewport = page.getViewport({ scale: finalScale });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const displayWidth = baseViewport.width * baseScale;
            const displayHeight = baseViewport.height * baseScale;
            
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            
            const context = canvas.getContext('2d');
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            this.mobilePages[pageNum - 1] = canvas;
            
            
        } catch (error) {
            console.error(`Error rendering mobile page ${pageNum}:`, error);
            
            // Show error placeholder
            const errorDiv = document.createElement('div');
            errorDiv.className = 'mobile-page-error';
            errorDiv.innerHTML = `
                <div class="error-content">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">Failed to load page ${pageNum}</div>
                </div>
            `;
            pageDiv.appendChild(errorDiv);
        }
    }

    generateMobileTOC() {
        const tocItems = document.getElementById('mobileTocItems');
        if (!tocItems) return;
        
        // Generate simple TOC for mobile
        const toc = [];
        const chaptersPerSection = Math.max(1, Math.floor(this.totalPages / 10));
        
        for (let i = 1; i <= this.totalPages; i += chaptersPerSection) {
            const chapterNum = Math.ceil(i / chaptersPerSection);
            toc.push({
                title: `Chapter ${chapterNum}`,
                page: i,
                level: 1
            });
        }
        
        tocItems.innerHTML = toc.map(item => `
            <button class="btn--ghost mobile-toc-item" data-page="${item.page}">
                ${item.title} (Page ${item.page})
            </button>
        `).join('');
        
        // Add click events
        tocItems.querySelectorAll('.mobile-toc-item').forEach(item => {
            item.addEventListener('click', () => {
                const pageNum = parseInt(item.getAttribute('data-page'));
                
                // Validate page number
                if (pageNum >= 1 && pageNum <= this.totalPages) {
                    this.scrollToMobilePage(pageNum);
                    
                    // Close modal after short delay
                    setTimeout(() => {
                        safeRemoveElement('.mobile-toc-modal');
                    }, 300);
                } else {
                    console.error(`Invalid page number: ${pageNum} (total: ${this.totalPages})`);
                }
            });
        });
    }
    
    scrollToMobilePage(pageNum) {
        try {
            
            const mobileViewer = document.getElementById('mobilePdfViewer');
            if (!mobileViewer) {
                console.error('Mobile viewer not found');
                return;
            }
            
            // Simple approach: scroll by percentage
            const scrollPercent = Math.max(0, (pageNum - 1) / this.totalPages);
            const maxScroll = mobileViewer.scrollHeight - mobileViewer.clientHeight;
            const targetScroll = scrollPercent * maxScroll;
            
            // Scroll to calculated position
            mobileViewer.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
            
            // Also try to find and load the specific page
            const pageElement = document.querySelector(`[data-page="${pageNum}"]`);
            if (pageElement && this.pageObserver) {
                // Force lazy loading for this page
                this.pageObserver.observe(pageElement);
            }
            
        } catch (error) {
            console.error('Error scrolling to page:', error);
        }
    }
    
    updateMobileProgress() {
        try {
            const mobileViewer = document.getElementById('mobilePdfViewer');
            const progressElement = document.getElementById('readingProgress');
            
            if (mobileViewer && progressElement && mobileViewer.scrollHeight > mobileViewer.clientHeight) {
                const scrollPercentage = (mobileViewer.scrollTop / (mobileViewer.scrollHeight - mobileViewer.clientHeight)) * 100;
                progressElement.textContent = `${Math.round(Math.max(0, Math.min(100, scrollPercentage)))}%`;
            }
        } catch (error) {
            console.error('Error updating mobile progress:', error);
        }
    }
    
    handleViewportChange() {
        try {
            if (this.isMobile) {
                this.setupMobileViewer();
                if (this.pdfDoc) {
                    this.renderMobilePages();
                }
            } else {
                // Switch back to desktop view
                safeRemoveElement('#mobilePdfViewer');
                // Restore original header
                this.restoreDesktopHeader();
                if (this.pdfDoc) {
                    this.renderPages();
                }
            }
            
            // ADDED: Rebind appropriate events after viewport change
            setTimeout(() => {
                if (this.isMobile) {
                    this.bindMobileEvents();
                } else {
                    this.bindEvents();
                }
            }, 200);
            
        } catch (error) {
            console.error('Error handling viewport change:', error);
        }
    }
    
    restoreDesktopHeader() {
        const readingHeader = document.querySelector('.reading-header');
        if (readingHeader) {
            readingHeader.classList.remove('mobile-reading-header');
        }
        
        const toolbar = document.querySelector('.reading-toolbar');
        if (toolbar) {
            toolbar.innerHTML = `
                <div class="toolbar-left">
                    <button class="btn--outline btn btn--ghost btn--round btn--floating">
                    <a href="index.html">❮❮</a>
                    </button>
                    <span class="pdf-title" id="currentPdfTitle">Loading...</span>
                </div>
                <div class="toolbar-center">
                    <button class="btn--outline" id="zoomOut">−</button>
                    <span class="zoom-level" id="zoomLevel">100%</span>
                    <button class="btn--outline" id="zoomIn">+</button>
                    <div class="page-controls">
                        <button class="btn--outline" id="prevPage">‹ Prev</button>
                        <span class="page-info" id="pageInfo"></span>
                        <button class="btn--outline" id="nextPage">Next ›</button>
                    </div>
                </div>
                <div class="toolbar-right">
                    <div class="theme-controls">
                        <label class="theme-toggle">
                            <input type="checkbox" id="themeToggle">
                            <span class="theme-slider">🌙</span>
                        </label>
                    </div>
                    <div class="eye-protection">
                        <button class="btn--sm eye-protection-btn" id="eyeProtectionToggle">
                            👁️ Eye Protection
                        </button>
                    </div>
                    <button class="btn--outline" id="toggleTOC">📋 Contents</button>
                    <button class="btn--outline" id="fullscreenBtn">⛶ Fullscreen</button>
                </div>
            `;
            
            // Re-bind desktop events
            this.bindEvents();
        }
    }
    
    bindEvents() {
        // Navigation controls
        document.getElementById('prevPage')?.addEventListener('click', () => this.previousPage());
        document.getElementById('nextPage')?.addEventListener('click', () => this.nextPage());
        
        // Zoom controls
        document.getElementById('zoomIn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut')?.addEventListener('click', () => this.zoomOut());
        
        // TOC toggle - UPDATED: Check if mobile mode
        const tocBtn = document.getElementById('toggleTOC');
        if (tocBtn && !this.isMobile) {
            // Only bind desktop TOC events if not mobile
            tocBtn.addEventListener('click', () => {
                this.toggleTOC();
            });
        }
        
        document.getElementById('closeTOC')?.addEventListener('click', () => this.closeTOC());
        
        // Fullscreen - UPDATED: Check if mobile mode
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn && !this.isMobile) {
            // Only bind desktop fullscreen events if not mobile
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Reading time tracker
        this.startReadingTimer();
    }
    
    async loadPDF() {
        const loader = document.getElementById('pdfLoading');
        const progressFill = document.getElementById('loadingProgress');
        const progressPercent = document.getElementById('loadingPercent');
        
        if (loader) {
            loader.classList.remove('hidden');
        }
        
        if (progressFill) progressFill.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
        
        try {
            // PERFORMANCE: Load title in parallel, don't block PDF loading
            this.loadPDFTitleAsync(); // Non-blocking
            
            const loadingTask = pdfjsLib.getDocument({
                url: `assets/${this.filename}`,
                // PERFORMANCE: Add caching and optimization options
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
                enableXfa: false, // Disable XFA for better performance
                onProgress: (progress) => {
                    if (progressFill && progressPercent && progress.total) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        progressFill.style.width = `${percent}%`;
                        progressPercent.textContent = `${percent}%`;
                    }
                }
            });
            
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;
            
            
            if (progressFill) progressFill.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';
            
            // PERFORMANCE: Render initial view only
            if (this.isMobile) {
                await this.renderMobilePages(); // Now uses lazy loading
            } else {
                await this.renderPages(); // Only renders current 2 pages
            }
            
            this.generateTOC();
            
        } catch (error) {
            console.error('Failed to load PDF:', error);
            alert('Failed to load PDF: ' + error.message);
            window.location.href = 'index.html';
        } finally {
            setTimeout(() => {
                if (loader) {
                    loader.classList.add('hidden');
                }
            }, 300); // Reduced delay
        }
    }

    // NEW: Load PDF title asynchronously (non-blocking)
    async loadPDFTitleAsync() {
        let pdfTitle = this.filename.replace('.pdf', '').replace(/_/g, ' ');
        
        try {
            const metadataResponse = await fetch('assets/pdf-list.json');
            if (metadataResponse.ok) {
                const pdfList = await metadataResponse.json();
                const pdfMetadata = pdfList.find(pdf => pdf.filename === this.filename);
                if (pdfMetadata && pdfMetadata.title) {
                    pdfTitle = pdfMetadata.title;
                }
            }
        } catch (error) {
            console.warn('Error loading PDF metadata:', error);
        }
        
        // Update title when ready
        const titleElement = document.getElementById('currentPdfTitle');
        if (titleElement) {
            titleElement.textContent = pdfTitle;
        }
    }

    
    async renderPage(pageNum, canvas) {
        if (!this.pdfDoc || pageNum > this.totalPages || pageNum < 1) {
            if (canvas) {
                canvas.style.display = 'none';
                const container = canvas.parentElement;
                if (container && container.classList.contains('pdf-page-container')) {
                    container.style.display = 'none';
                }
            }
            return;
        }
        
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            
            // PERFORMANCE: Cap device pixel ratio for better performance
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            
            const baseViewport = page.getViewport({ scale: 1 });
            
            // PERFORMANCE: Use more efficient scale calculation
            const finalScale = this.zoom * dpr;
            const viewport = page.getViewport({ scale: finalScale });
            
            // Set canvas size efficiently
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const displayWidth = baseViewport.width * this.zoom;
            const displayHeight = baseViewport.height * this.zoom;
            
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            canvas.style.display = 'block';
            
            const container = canvas.parentElement;
            if (container && container.classList.contains('pdf-page-container')) {
                container.style.display = 'block';
            }
            
            // PERFORMANCE: Use willReadFrequently for better performance
            const context = canvas.getContext('2d', { willReadFrequently: false });
            
            await page.render({ 
                canvasContext: context, 
                viewport: viewport 
            }).promise;
            
            const pageNumberElement = canvas.parentElement.querySelector('.page-number');
            if (pageNumberElement) {
                pageNumberElement.textContent = pageNum;
            }
            
        } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
            if (canvas) {
                canvas.style.display = 'none';
                const container = canvas.parentElement;
                if (container && container.classList.contains('pdf-page-container')) {
                    container.style.display = 'none';
                }
            }
        }
    }
    
    async renderPages() {
        const leftCanvas = document.getElementById('leftPageCanvas');
        const rightCanvas = document.getElementById('rightPageCanvas');
        
        if (!leftCanvas || !rightCanvas) {
            console.error('Canvas elements not found');
            return;
        }
        
        await this.renderPage(this.currentPage, leftCanvas);
        if (this.currentPage + 1 <= this.totalPages) {
            await this.renderPage(this.currentPage + 1, rightCanvas);
        } else {
            const rightContainer = rightCanvas.parentElement;
            if (rightContainer && rightContainer.classList.contains('pdf-page-container')) {
                rightContainer.style.display = 'none';
            }
        }
        
        this.updateUI();
    }
    
    updateUI() {
        // Update page info
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            const rightPage = Math.min(this.currentPage + 1, this.totalPages);
            if (this.currentPage === this.totalPages) {
                pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
            } else {
                pageInfo.textContent = `Page ${this.currentPage}-${rightPage} of ${this.totalPages}`;
            }
        }
        
        // Update zoom level display
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
        }
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
        if (zoomInBtn) zoomInBtn.disabled = this.currentZoomIndex >= this.zoomLevels.length - 1;
        if (zoomOutBtn) zoomOutBtn.disabled = this.currentZoomIndex <= 0;
        
        // Update reading progress
        const progress = Math.round((this.currentPage / this.totalPages) * 100);
        const progressElement = document.getElementById('readingProgress');
        if (progressElement) {
            progressElement.textContent = `${progress}%`;
        }
    }
    
    // Navigation methods
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage = Math.max(1, this.currentPage - 2);
            this.renderPages();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage = Math.min(this.totalPages - 1, this.currentPage + 2);
            if (this.currentPage === this.totalPages - 1 && this.totalPages % 2 === 0) {
                this.currentPage = this.totalPages - 1;
            }
            this.renderPages();
        }
    }
    
    zoomIn() {
        if (this.currentZoomIndex < this.zoomLevels.length - 1) {
            this.currentZoomIndex++;
            this.zoom = this.zoomLevels[this.currentZoomIndex];
            this.renderPages();
        }
    }
    
    zoomOut() {
        if (this.currentZoomIndex > 0) {
            this.currentZoomIndex--;
            this.zoom = this.zoomLevels[this.currentZoomIndex];
            this.renderPages();
        }
    }
    
    setZoomLevel(zoomPercent) {
        const targetZoom = zoomPercent / 100;
        let closestIndex = 0;
        let closestDiff = Math.abs(this.zoomLevels[0] - targetZoom);
        
        for (let i = 1; i < this.zoomLevels.length; i++) {
            const diff = Math.abs(this.zoomLevels[i] - targetZoom);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestIndex = i;
            }
        }
        
        this.currentZoomIndex = closestIndex;
        this.zoom = this.zoomLevels[closestIndex];
        this.renderPages();
    }
    
    toggleTOC() {
        const sidebar = document.getElementById('tocSidebar');
        if (sidebar) {
            if (sidebar.classList.contains('hidden')) {
                sidebar.classList.remove('hidden');
                setTimeout(() => {
                    sidebar.classList.add('open');
                }, 10);
            } else {
                sidebar.classList.remove('open');
                setTimeout(() => {
                    sidebar.classList.add('hidden');
                }, 250);
            }
        }
    }
    
    closeTOC() {
        const sidebar = document.getElementById('tocSidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
            setTimeout(() => {
                sidebar.classList.add('hidden');
            }, 250);
        }
    }
    
    generateTOC() {
        const tocContent = document.getElementById('tocContent');
        if (!tocContent) return;
        
        const toc = [];
        const chaptersPerSection = Math.max(1, Math.floor(this.totalPages / 10));
        
        for (let i = 1; i <= this.totalPages; i += chaptersPerSection) {
            const chapterNum = Math.ceil(i / chaptersPerSection);
            toc.push({
                title: `Chapter ${chapterNum}`,
                page: i,
                level: 1
            });
            
            for (let j = 1; j < chaptersPerSection && i + j <= this.totalPages; j++) {
                toc.push({
                    title: `Section ${chapterNum}.${j}`,
                    page: i + j,
                    level: 2
                });
            }
        }
        
        tocContent.innerHTML = toc.map(item => `
            <a href="#" class="toc-item level-${item.level}" data-page="${item.page}">
                ${item.title}
            </a>
        `).join('');
        
        tocContent.querySelectorAll('.toc-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToPage(parseInt(item.getAttribute('data-page')));
                if (!this.isMobile) {
                    this.closeTOC();
                }
            });
        });
    }
    
    goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            this.currentPage = pageNum;
            this.renderPages();
        }
    }
    
    toggleFullscreen() {
        try {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement
            );
            
            if (isCurrentlyFullscreen) {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            } else {
                // Enter fullscreen
                const element = document.documentElement;
                
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.mozRequestFullScreen) {
                    element.mozRequestFullScreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                } else {
                    // Fallback for browsers that don't support fullscreen API
                    console.warn('Fullscreen API not supported');
                    this.simulateFullscreen();
                }
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
            this.simulateFullscreen();
        }
    }

    // ADDED: Fallback fullscreen simulation for mobile browsers
    simulateFullscreen() {
        const body = document.body;
        const isSimulatedFullscreen = body.classList.contains('simulated-fullscreen');
        
        if (isSimulatedFullscreen) {
            // Exit simulated fullscreen
            body.classList.remove('simulated-fullscreen');
            
            // Restore scroll
            body.style.overflow = '';
            
            // Update button
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '⛶';
                fullscreenBtn.title = 'Enter Fullscreen';
            }
        } else {
            // Enter simulated fullscreen
            body.classList.add('simulated-fullscreen');
            
            // Hide scroll
            body.style.overflow = 'hidden';
            
            // Try to hide address bar on mobile
            window.scrollTo(0, 1);
            
            // Update button
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '✖';
                fullscreenBtn.title = 'Exit Fullscreen';
            }
        }
    }
    
    handleKeyboard(e) {
        if (this.isMobile) return; // Disable keyboard shortcuts on mobile
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.previousPage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextPage();
                break;
            case '+':
            case '=':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.zoomIn();
                }
                break;
            case '-':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.zoomOut();
                }
                break;
            case '0':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.setZoomLevel(100);
                }
                break;
            case 'f':
            case 'F11':
                e.preventDefault();
                this.toggleFullscreen();
                break;
        }
    }
    
    startReadingTimer() {
        const startTime = Date.now();
        const timerElement = document.getElementById('readingTime');
        
        if (timerElement) {
            setInterval(() => {
                const elapsed = Date.now() - startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }
    }
    
    // Enhanced cleanup method
    cleanup() {
        try {
            safeRemoveElement('.mobile-toc-modal');
            safeRemoveElement('#mobilePdfViewer');
            
            // Cleanup intersection observer
            if (this.pageObserver) {
                this.pageObserver.disconnect();
                this.pageObserver = null;
            }
            
            if (this.handleTOCClick) {
                const tocBtn = document.getElementById('toggleTOC');
                if (tocBtn) {
                    tocBtn.removeEventListener('click', this.handleTOCClick);
                }
            }
            
            // ADDED: Cleanup fullscreen handler
            if (this.handleFullscreenClick) {
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                if (fullscreenBtn) {
                    fullscreenBtn.removeEventListener('click', this.handleFullscreenClick);
                }
            }
            
            if (this.handleMobileScroll) {
                const mobileViewer = document.getElementById('mobilePdfViewer');
                if (mobileViewer) {
                    mobileViewer.removeEventListener('scroll', this.handleMobileScroll);
                }
            }
            
            // Remove simulated fullscreen if active
            document.body.classList.remove('simulated-fullscreen');
            document.body.style.overflow = '';
            
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.viewerApp && typeof window.viewerApp.cleanup === 'function') {
        window.viewerApp.cleanup();
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.viewerApp = new ViewerApp();
});
