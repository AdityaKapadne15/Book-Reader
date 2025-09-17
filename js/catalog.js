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
        // FIXED: Initialize search state properly
        this.state.setState({ 
            searchQuery: '',
            selectedCategory: ''
        });
        
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
            
            // FIXED: Use a single, debounced input handler
            let searchTimeout;
            
            const handleSearch = (e) => {
                clearTimeout(searchTimeout);
                
                searchTimeout = setTimeout(() => {
                    const query = e.target.value.trim().toLowerCase();
                    
                    // Update state
                    this.state.setState({ searchQuery: query });
                    
                    // Re-render catalog
                    this.renderCatalog();
                }, 300); // 300ms debounce
            };
            
            // Bind to input event with debouncing
            searchInput.addEventListener('input', handleSearch);
            
            // Also handle paste events
            searchInput.addEventListener('paste', (e) => {
                setTimeout(() => handleSearch(e), 10);
            });
            
            // Clear search on escape
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    this.state.setState({ searchQuery: '' });
                    this.renderCatalog();
                }
            });
        } else {
            console.warn('Search input not found');
        }
        
        if (categoryFilter) {
            
            categoryFilter.addEventListener('change', (e) => {
                const category = e.target.value;
                
                this.state.setState({ selectedCategory: category });
                this.renderCatalog();
            });
        } else {
            console.warn('Category filter not found');
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
        }
        
        // Apply category filter
        if (this.state.state.selectedCategory && this.state.state.selectedCategory !== '') {
            filtered = filtered.filter(pdf => pdf.category === this.state.state.selectedCategory);
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--color-text-secondary);">
                    <p>No Books found matching your criteria.</p>
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
        this.updateShelfTitleWithCount(filtered.length);
    }

    updateShelfTitle() {
        const shelfTitle = document.getElementById('shelfTitle');
        if (shelfTitle) {
            const totalCount = this.pdfs.length;
            shelfTitle.textContent = `Your Shelf (${totalCount})`;
        }
    }

    updateShelfTitleWithCount(count) {
        const shelfTitle = document.getElementById('shelfTitle');
        if (shelfTitle) {
            const totalCount = this.pdfs.length;
            if (count === totalCount) {
                // Show total count when no filters
                shelfTitle.textContent = `Your Shelf (${totalCount})`;
            } else {
                // Show filtered count with total when filters are active
                shelfTitle.textContent = `Your Shelf (${count} of ${totalCount})`;
            }
        }
    }
        
    async loadCatalog() {
        const loader = document.getElementById('catalogLoader');
        const grid = document.getElementById('pdfGrid');
        
        // Show loader
        if (loader) {
            loader.classList.remove('hidden');
        }
        
        try {
            // Try to load from assets/pdf-list.json first
            let res;
            try {
                res = await fetch('assets/pdf-list.json');
                if (res.ok) {
                    this.pdfs = await res.json();
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
                        pages: 238,
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
            
            // REMOVED: The performance-killing PDF page count extraction
            // Now render immediately with pre-defined page counts from JSON
            
            this.populateCategoryFilter();
            this.renderCatalog();
            this.updateShelfTitle(); 
            
        } catch (error) {
            console.error('Failed to load catalog:', error);
            if (grid) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--color-text-secondary);">Failed to load PDF catalog.</div>';
            }
        } finally {
            // Hide loader
            if (loader) {
                loader.classList.add('hidden');
            }
        }
    }

    // ADDED: Update a single card without re-rendering everything
    updateSingleCard(pdf) {
        const card = document.querySelector(`[data-filename="${pdf.filename}"]`);
        if (card) {
            const pagesSpan = card.querySelector('.pdf-meta span:first-child');
            if (pagesSpan) {
                pagesSpan.textContent = `${pdf.pages} pages`;
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
        
        // FIXED: Apply search filter with better logic
        if (this.state.state.searchQuery && this.state.state.searchQuery.trim().length > 0) {
            const query = this.state.state.searchQuery.toLowerCase().trim();
            filtered = filtered.filter(pdf => {
                // Search in multiple fields with null checks
                const titleMatch = pdf.title && pdf.title.toLowerCase().includes(query);
                const descMatch = pdf.description && pdf.description.toLowerCase().includes(query);
                const authorMatch = pdf.author && pdf.author.toLowerCase().includes(query);
                const categoryMatch = pdf.category && pdf.category.toLowerCase().includes(query);
                
                return titleMatch || descMatch || authorMatch || categoryMatch;
            });
        }
        
        // Apply category filter
        if (this.state.state.selectedCategory && this.state.state.selectedCategory !== '') {
            filtered = filtered.filter(pdf => pdf.category === this.state.state.selectedCategory);
        }
        
        // Handle empty results
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--color-text-secondary);">
                    <p>No Books found matching your criteria.</p>
                    ${this.state.state.searchQuery ? `<p>Try a different search term: "${this.state.state.searchQuery}"</p>` : ''}
                    ${this.state.state.selectedCategory ? `<p>Category: "${this.state.state.selectedCategory}"</p>` : ''}
                </div>
            `;
            return;
        }
        
        // Render filtered results
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
                    <p class="pdf-description">${pdf.description || ''}</p>
                    <div class="pdf-meta">
                        <span>${pdf.pages || '?'} pages</span>
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
        this.updateShelfTitleWithCount(filtered.length);
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