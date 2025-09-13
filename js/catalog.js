// js/catalog.js - Fixed loading state management
import { AppState } from './state.js';
import { EyeProtectionManager } from './eyeProtection.js';
import { ThemeManager } from './theme.js';

// Configure PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

class CatalogApp {
    constructor() {
        this.state = new AppState();
        this.pdfs = [];
        this.init();
    }
    
    init() {
        this.themeManager = new ThemeManager(this.state);
        this.eyeProtection = new EyeProtectionManager(this.state);
        
        this.bindEvents();
        this.loadCatalog();
    }
    
// js/catalog.js - Fixed search functionality
    bindEvents() {
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (searchInput) {
            // Add multiple event listeners for better responsiveness
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                console.log('Search query:', query); // Debug log
                this.state.setState({ searchQuery: query });
                this.renderCatalog();
            });
            
            // Also listen for keyup for immediate response
            searchInput.addEventListener('keyup', (e) => {
                const query = e.target.value.trim().toLowerCase();
                this.state.setState({ searchQuery: query });
                this.renderCatalog();
            });
            
            // Clear search functionality
            searchInput.addEventListener('blur', (e) => {
                if (e.target.value.trim() === '') {
                    this.state.setState({ searchQuery: '' });
                    this.renderCatalog();
                }
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                console.log('Category filter:', e.target.value); // Debug log
                this.state.setState({ selectedCategory: e.target.value });
                this.renderCatalog();
            });
        }
        
        // View toggle buttons
        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');
        
        if (gridViewBtn && listViewBtn) {
            gridViewBtn.addEventListener('click', () => this.switchView('grid'));
            listViewBtn.addEventListener('click', () => this.switchView('list'));
        }
    }

    renderCatalog() {
        const grid = document.getElementById('pdfGrid');
        if (!grid) return;
        
        let filtered = [...this.pdfs];
        
        console.log('Original PDFs count:', filtered.length);
        console.log('Search query:', this.state.state.searchQuery);
        console.log('Selected category:', this.state.state.selectedCategory);
        
        // Apply search filter - more comprehensive search
        if (this.state.state.searchQuery && this.state.state.searchQuery.length > 0) {
            const query = this.state.state.searchQuery.toLowerCase();
            filtered = filtered.filter(pdf => {
                // Search in multiple fields
                const titleMatch = pdf.title && pdf.title.toLowerCase().includes(query);
                const descMatch = pdf.description && pdf.description.toLowerCase().includes(query);
                const authorMatch = pdf.author && pdf.author.toLowerCase().includes(query);
                const categoryMatch = pdf.category && pdf.category.toLowerCase().includes(query);
                
                return titleMatch || descMatch || authorMatch || categoryMatch;
            });
            console.log('After search filter:', filtered.length);
        }
        
        // Apply category filter
        if (this.state.state.selectedCategory && this.state.state.selectedCategory !== '') {
            filtered = filtered.filter(pdf => pdf.category === this.state.state.selectedCategory);
            console.log('After category filter:', filtered.length);
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--color-text-secondary);">
                    <p>No PDFs found matching your criteria.</p>
                    ${this.state.state.searchQuery ? `<p>Try searching for: "${this.state.state.searchQuery}"</p>` : ''}
                </div>
            `;
            return;
        }
        
        grid.innerHTML = filtered.map(pdf => `
            <div class="pdf-card" data-filename="${pdf.filename}">
                <div class="pdf-thumbnail">
                    <img src="assets/thumbnails/${pdf.thumbnail || 'default.jpg'}" 
                        alt="${pdf.title}" 
                        onerror="this.style.display='none'; this.parentElement.innerHTML='📄';">
                </div>
                <div class="pdf-card-content">
                    <h3>${pdf.title}</h3>
                    <p class="pdf-author">${pdf.author || ''}</p>
                    <p class="pdf-description">${pdf.description}</p>
                    <div class="pdf-meta">
                        <span>${pdf.pages} pages</span>
                        <span class="pdf-category">${pdf.category}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click events
        grid.querySelectorAll('.pdf-card').forEach(card => {
            card.addEventListener('click', () => {
                const filename = card.getAttribute('data-filename');
                window.location.href = `viewer.html?pdf=${encodeURIComponent(filename)}`;
            });
        });
        
        console.log(`Rendered ${filtered.length} PDF cards`);
    }
        
    async loadCatalog() {
        const loader = document.getElementById('catalogLoader');
        const grid = document.getElementById('pdfGrid');
        
        console.log('Starting catalog load...');
        
        // Show loader
        if (loader) {
            loader.classList.remove('hidden');
            console.log('Loader shown');
        }
        
        try {
            // Try to load from assets/pdf-list.json first
            let res;
            try {
                res = await fetch('assets/pdf-list.json');
                if (res.ok) {
                    this.pdfs = await res.json();
                    console.log('Loaded PDFs from JSON:', this.pdfs.length);
                } else {
                    throw new Error('JSON file not found');
                }
            } catch (error) {
                console.log('JSON file not found, using fallback data');
                // Fallback to hardcoded PDFs if json file doesn't exist
                this.pdfs = [
                    {
                        id: 1,
                        title: "DR (CDR) N K Natrajan SSB INTERVIEW COMPLETE GUIDE",
                        filename: "DR_CDR)_N_K_Natrajan_SSB_INTERVIEW_COMPLETE_GUIDE.pdf", 
                        thumbnail: "DR_CDR)_N_K_Natrajan_SSB_INTERVIEW_COMPLETE_GUIDE.jpg",
                        description: "A comprehensive technical manual demonstrating dual-page reading experience",
                        pages: 120,
                        category: "Technical",
                        author: "DR (CDR) N K Natrajan"
                    },
                    {
                        id: 2,
                        title: "Programming Guide",
                        filename: "sample2.pdf",
                        thumbnail: "default.jpg", 
                        description: "Complete programming reference with code examples",
                        pages: 85,
                        category: "Programming",
                        author: "Programming Expert"
                    },
                    {
                        id: 3,
                        title: "Design Principles",
                        filename: "sample3.pdf",
                        thumbnail: "default.jpg",
                        description: "Modern design principles and best practices",
                        pages: 64,
                        category: "Design",
                        author: "Design Guru"
                    }
                ];
            }
            
            // Extract page count using PDF.js (optional, don't block rendering)
            for (let pdf of this.pdfs) {
                try {
                    if (typeof pdfjsLib !== 'undefined') {
                        const doc = await pdfjsLib.getDocument(`assets/${pdf.filename}`).promise;
                        pdf.pages = doc.numPages;
                        console.log(`Loaded page count for ${pdf.filename}: ${pdf.pages}`);
                    }
                } catch (error) {
                    console.warn(`Could not load page count for ${pdf.filename}:`, error);
                    pdf.pages = pdf.pages || '?';
                }
            }
            
            console.log('Populating category filter and rendering catalog...');
            this.populateCategoryFilter();
            this.renderCatalog();
            
        } catch (error) {
            console.error('Failed to load catalog:', error);
            if (grid) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--color-text-secondary);">Failed to load PDF catalog.</div>';
            }
        } finally {
            // Hide loader
            if (loader) {
                loader.classList.add('hidden');
                console.log('Loader hidden');
            }
        }
    }
    
    populateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;
        
        const categories = [...new Set(this.pdfs.map(pdf => pdf.category))];
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
        });
    }
    
    renderCatalog() {
        const grid = document.getElementById('pdfGrid');
        if (!grid) return;
        
        let filtered = [...this.pdfs];
        
        // Apply filters
        if (this.state.state.searchQuery) {
            filtered = filtered.filter(pdf => 
                pdf.title.toLowerCase().includes(this.state.state.searchQuery) ||
                pdf.description.toLowerCase().includes(this.state.state.searchQuery) ||
                (pdf.author && pdf.author.toLowerCase().includes(this.state.state.searchQuery)) ||
                pdf.category.toLowerCase().includes(this.state.state.searchQuery)
            );
        }
        
        if (this.state.state.selectedCategory) {
            filtered = filtered.filter(pdf => pdf.category === this.state.state.selectedCategory);
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--color-text-secondary);">No PDFs found matching your criteria.</div>';
            return;
        }
        
        grid.innerHTML = filtered.map(pdf => `
            <div class="pdf-card" data-filename="${pdf.filename}">
                <div class="pdf-thumbnail">
                    <img src="assets/thumbnails/${pdf.thumbnail || 'default.jpg'}" 
                         alt="${pdf.title}" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='📄';">
                </div>
                <div class="pdf-card-content">
                    <h3>${pdf.title}</h3>
                    <p>${pdf.author || ''}</p>
                    <p class="pdf-description">${pdf.description?pdf.description:" "}</p>
                    <div class="pdf-meta">
                        <span>${pdf.pages} pages</span>
                        <span class="pdf-category">${pdf.category}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click events
        grid.querySelectorAll('.pdf-card').forEach(card => {
            card.addEventListener('click', () => {
                const filename = card.getAttribute('data-filename');
                window.location.href = `viewer.html?pdf=${encodeURIComponent(filename)}`;
            });
        });
        
        console.log(`Rendered ${filtered.length} PDF cards`);
    }
    
    switchView(viewType) {
        const grid = document.getElementById('pdfGrid');
        const gridBtn = document.getElementById('gridView');
        const listBtn = document.getElementById('listView');
        
        if (grid && gridBtn && listBtn) {
            if (viewType === 'grid') {
                grid.className = 'pdf-grid';
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
            } else {
                grid.className = 'pdf-grid pdf-list';
                listBtn.classList.add('active');
                gridBtn.classList.remove('active');
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CatalogApp();
});