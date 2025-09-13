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
        
        if (this.isMobile) {
            this.setupMobileViewer();
        }
    }
    
    setupMobileViewer() {
        if (!this.isMobile) return;
        
        console.log('Setting up mobile viewer');
        
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
                <button class="btn--outline btn btn--ghost btn--round btn--floating">
                <a href="index.html">❮❮</a>
                </button>
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
                    
                    <button class="btn--sm btn--ghost" id="toggleTOC">📋</button>
                    <button class="btn--sm btn--ghost" id="fullscreenBtn">⛶</button>
                </div>
            </div>
        `;
        
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
                this.handleTOCClick = () => this.showMobileTOC();
                tocBtn.addEventListener('click', this.handleTOCClick);
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
        
        console.log('Rendering mobile pages...');
        
        // Clear existing pages
        container.innerHTML = '';
        this.mobilePages = [];
        
        // Show loading indicator
        container.innerHTML = '<div class="mobile-loading">Loading pages...</div>';
        
        // Render all pages for mobile scrolling
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            try {
                if (pageNum === 1) {
                    // Clear loading indicator after first page starts rendering
                    container.innerHTML = '';
                }
                
                const pageDiv = document.createElement('div');
                pageDiv.className = 'mobile-pdf-page';
                
                const canvas = document.createElement('canvas');
                canvas.id = `mobilePage${pageNum}`;
                
                const indicator = document.createElement('div');
                indicator.className = 'mobile-page-indicator';
                indicator.textContent = `Page ${pageNum} of ${this.totalPages}`;
                
                pageDiv.appendChild(canvas);
                pageDiv.appendChild(indicator);
                container.appendChild(pageDiv);
                
                // Render page
                const page = await this.pdfDoc.getPage(pageNum);
                const scale = Math.min(
                    (window.innerWidth - 24) / page.getViewport({ scale: 1 }).width,
                    1.5 // Max scale for mobile
                );
                const viewport = page.getViewport({ scale });
                
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: viewport
                }).promise;
                
                this.mobilePages.push(canvas);
                
            } catch (error) {
                console.error(`Error rendering mobile page ${pageNum}:`, error);
            }
        }
        
        console.log(`Rendered ${this.mobilePages.length} mobile pages`);
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
                this.scrollToMobilePage(pageNum);
                
                // Safely close modal
                safeRemoveElement('.mobile-toc-modal');
            });
        });
    }
    
    scrollToMobilePage(pageNum) {
        try {
            const pageElement = document.getElementById(`mobilePage${pageNum}`);
            if (pageElement) {
                pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                console.warn(`Mobile page ${pageNum} not found`);
            }
        } catch (error) {
            console.error('Error scrolling to mobile page:', error);
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
        
        // TOC toggle
        document.getElementById('toggleTOC')?.addEventListener('click', () => {
            if (this.isMobile) {
                this.showMobileTOC();
            } else {
                this.toggleTOC();
            }
        });
        
        document.getElementById('closeTOC')?.addEventListener('click', () => this.closeTOC());
        
        // Fullscreen
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => this.toggleFullscreen());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Reading time tracker
        this.startReadingTimer();
    }
    
    async loadPDF() {
        const loader = document.getElementById('pdfLoading');
        const progressFill = document.getElementById('loadingProgress');
        const progressPercent = document.getElementById('loadingPercent');
        
        console.log('Starting PDF load for:', this.filename);
        
        // Show loader
        if (loader) {
            loader.classList.remove('hidden');
            console.log('PDF loader shown');
        }
        
        // Reset progress
        if (progressFill) progressFill.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
        
        try {
            console.log('Loading PDF:', this.filename);
            
            // ADDED: Fetch PDF metadata from pdf-list.json
            let pdfTitle = this.filename.replace('.pdf', '').replace(/_/g, ' '); // Fallback title
            try {
                const metadataResponse = await fetch('assets/pdf-list.json');
                if (metadataResponse.ok) {
                    const pdfList = await metadataResponse.json();
                    const pdfMetadata = pdfList.find(pdf => pdf.filename === this.filename);
                    if (pdfMetadata && pdfMetadata.title) {
                        pdfTitle = pdfMetadata.title;
                        console.log('Found PDF title in metadata:', pdfTitle);
                    } else {
                        console.warn('PDF not found in metadata, using filename as title');
                    }
                } else {
                    console.warn('Could not load pdf-list.json, using filename as title');
                }
            } catch (metadataError) {
                console.warn('Error loading PDF metadata:', metadataError);
            }
            
            // Update title early with metadata
            const titleElement = document.getElementById('currentPdfTitle');
            if (titleElement) {
                titleElement.textContent = pdfTitle;
            }
            
            const loadingTask = pdfjsLib.getDocument({
                url: `assets/${this.filename}`,
                onProgress: (progress) => {
                    console.log('PDF loading progress:', progress);
                    if (progressFill && progressPercent && progress.total) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        progressFill.style.width = `${percent}%`;
                        progressPercent.textContent = `${percent}%`;
                        console.log(`Loading progress: ${percent}%`);
                    }
                }
            });
            
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;
            
            console.log('PDF loaded successfully. Total pages:', this.totalPages);
            
            // Final progress update
            if (progressFill) progressFill.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';
            
            // Render based on device type
            if (this.isMobile) {
                await this.renderMobilePages();
            } else {
                await this.renderPages();
            }
            
            this.generateTOC();
            
            console.log('PDF rendering complete');
            
        } catch (error) {
            console.error('Failed to load PDF:', error);
            alert('Failed to load PDF: ' + error.message);
            window.location.href = 'index.html';
        } finally {
            // Hide loader with a small delay to show 100% completion
            setTimeout(() => {
                if (loader) {
                    loader.classList.add('hidden');
                    console.log('PDF loader hidden');
                }
            }, 500);
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
            const viewport = page.getViewport({ scale: this.zoom });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = 'block';
            
            const container = canvas.parentElement;
            if (container && container.classList.contains('pdf-page-container')) {
                container.style.display = 'block';
            }
            
            const context = canvas.getContext('2d');
            await page.render({ 
                canvasContext: context, 
                viewport: viewport 
            }).promise;
            
            const pageNumberElement = canvas.parentElement.querySelector('.page-number');
            if (pageNumberElement) {
                pageNumberElement.textContent = pageNum;
            }
            
            console.log(`Rendered page ${pageNum}`);
            
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
        
        console.log(`Rendering pages ${this.currentPage} and ${this.currentPage + 1}`);
        
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
            console.log(`Zooming in to ${Math.round(this.zoom * 100)}%`);
            this.renderPages();
        }
    }
    
    zoomOut() {
        if (this.currentZoomIndex > 0) {
            this.currentZoomIndex--;
            this.zoom = this.zoomLevels[this.currentZoomIndex];
            console.log(`Zooming out to ${Math.round(this.zoom * 100)}%`);
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
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
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
            
            if (this.handleTOCClick) {
                const tocBtn = document.getElementById('toggleTOC');
                if (tocBtn) {
                    tocBtn.removeEventListener('click', this.handleTOCClick);
                }
            }
            
            if (this.handleMobileScroll) {
                const mobileViewer = document.getElementById('mobilePdfViewer');
                if (mobileViewer) {
                    mobileViewer.removeEventListener('scroll', this.handleMobileScroll);
                }
            }
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
