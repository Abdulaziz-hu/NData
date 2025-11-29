// --- DATA LAYER ---
class DataService {
    constructor() {
        this.data = [];
        this.initialized = false;
    }

    async init() {
        // Fetch from external JSON file
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('../../api/data/data.json');
                if (!response.ok) {
                    throw new Error('Failed to load data');
                }
                this.data = await response.json();
                this.initialized = true;
                resolve(this.data);
            } catch (error) {
                console.error('Error loading data:', error);
                reject(error);
            }
        });
    }

    getAll() { 
        return this.data; 
    }

    getByCategory(cat) {
        if (cat === 'all') return this.data;
        return this.data.filter(item => item.category === cat);
    }

    search(query) {
        if (!query || query.trim() === '') {
            return this.data;
        }
        const lowerQ = query.toLowerCase();
        return this.data.filter(item => {
            // Search in name, brand, description
            const nameMatch = item.name.toLowerCase().includes(lowerQ);
            const brandMatch = item.brand.toLowerCase().includes(lowerQ);
            const descMatch = item.description.toLowerCase().includes(lowerQ);
            
            // Search in specs values
            const specsMatch = Object.values(item.specs).some(val => 
                String(val).toLowerCase().includes(lowerQ)
            );
            
            return nameMatch || brandMatch || descMatch || specsMatch;
        });
    }

    getById(id) {
        return this.data.find(item => item.id === id);
    }
}

// --- UI LAYER ---
class App {
    constructor() {
        this.service = new DataService();
        this.currentCategory = 'all';
        this.grid = document.getElementById('grid-container');
        this.loader = document.getElementById('loader');
        this.searchInput = document.getElementById('search-input');
        this.itemCount = document.getElementById('item-count');
        this.modal = document.getElementById('modal');
        this.modalPanel = document.getElementById('modal-panel');
        this.currentSearchQuery = '';
        
        // Lightbox properties
        this.lightbox = document.getElementById('image-lightbox');
        this.lightboxImage = document.getElementById('lightbox-image');
        this.lightboxCounter = document.getElementById('lightbox-counter');
        this.currentImages = [];
        this.currentImageIndex = 0;
        
        this.bindEvents();
        this.initTheme();
    }

    async start() {
        this.showLoader(true);
        try {
            await this.service.init();
            this.showLoader(false);
            this.render(this.service.getAll());
            
            // Initialize Icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            this.showLoader(false);
            this.showError('Failed to load data. Please refresh the page.');
        }
    }

    bindEvents() {
        // Search Listener with debounce
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value;
                this.currentSearchQuery = query;
                const results = this.service.search(query);
                this.render(results);
            }, 300);
        });

        // Category Filters
        const buttons = document.querySelectorAll('#category-filters button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Toggle active class
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Filter
                this.currentCategory = btn.dataset.cat;
                
                // If there's a search query, apply both filters
                if (this.currentSearchQuery) {
                    const searchResults = this.service.search(this.currentSearchQuery);
                    const filtered = this.currentCategory === 'all' 
                        ? searchResults 
                        : searchResults.filter(item => item.category === this.currentCategory);
                    this.render(filtered);
                } else {
                    const results = this.service.getByCategory(this.currentCategory);
                    this.render(results);
                }
            });
        });

        // Theme Toggle - Desktop
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Mobile Menu Toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuPanel = document.getElementById('mobile-menu-panel');
        const mobileMenuClose = document.getElementById('mobile-menu-close');
        const mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');

        if (mobileMenuBtn && mobileMenu && mobileMenuPanel) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.remove('hidden');
                setTimeout(() => {
                    mobileMenuPanel.classList.remove('translate-x-full');
                }, 10);
                document.body.style.overflow = 'hidden';
            });

            const closeMobileMenu = () => {
                mobileMenuPanel.classList.add('translate-x-full');
                setTimeout(() => {
                    mobileMenu.classList.add('hidden');
                    document.body.style.overflow = '';
                }, 300);
            };

            if (mobileMenuClose) {
                mobileMenuClose.addEventListener('click', closeMobileMenu);
            }
            if (mobileMenuBackdrop) {
                mobileMenuBackdrop.addEventListener('click', closeMobileMenu);
            }
        }

        // Theme Toggle - Mobile
        const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
        if (mobileThemeToggle) {
            mobileThemeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Keyboard navigation for modal and lightbox
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.lightbox.classList.contains('hidden')) {
                    this.closeLightbox();
                } else if (!this.modal.classList.contains('hidden')) {
                    this.closeModal();
                }
            }
            
            // Arrow keys for lightbox navigation
            if (!this.lightbox.classList.contains('hidden')) {
                if (e.key === 'ArrowLeft') {
                    this.prevImage();
                } else if (e.key === 'ArrowRight') {
                    this.nextImage();
                }
            }
        });
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        // Re-render icons to ensure color contrast if needed
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    initTheme() {
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        // Check for system preference if no saved theme
        else if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }
    }

    showLoader(show) {
        if (show) {
            this.loader.classList.remove('hidden');
            this.grid.classList.add('hidden');
        } else {
            this.loader.classList.add('hidden');
            this.grid.classList.remove('hidden');
        }
    }

    showError(message) {
        this.grid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <h3 class="text-2xl sm:text-3xl mb-4 text-red-600">ERROR</h3>
                <p class="opacity-60 font-mono">${message}</p>
            </div>
        `;
    }

    render(items) {
        this.grid.innerHTML = '';
        this.itemCount.textContent = items.length;
        
        const noResults = document.getElementById('no-results');
        if (items.length === 0) {
            noResults.classList.remove('hidden');
            this.grid.classList.add('hidden');
            return;
        } else {
            noResults.classList.add('hidden');
            this.grid.classList.remove('hidden');
        }

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'data-card p-4 sm:p-6 flex flex-col h-full cursor-pointer';
            card.onclick = () => this.openDetails(item);
            
            // Specs preview (first 2 keys)
            const specPreview = Object.entries(item.specs).slice(0, 2).map(([key, val]) => 
                `<div class="flex justify-between text-xs opacity-70 font-mono mt-1">
                    <span class="uppercase truncate mr-2">${key.replace(/_/g, ' ')}</span>
                    <span class="text-right flex-shrink-0">${val}</span>
                </div>`
            ).join('');

            card.innerHTML = `
                <div class="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                    <span class="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-2 py-1 uppercase tracking-wider flex-shrink-0">${this.escapeHtml(item.brand)}</span>
                    <span class="font-mono text-sm font-bold flex-shrink-0">$${item.price}</span>
                </div>
                <h3 class="text-lg sm:text-xl font-bold mb-2 glitch-hover line-clamp-2">${this.escapeHtml(item.name)}</h3>
                <p class="text-xs sm:text-sm opacity-60 mb-4 sm:mb-6 flex-grow line-clamp-3">${this.escapeHtml(item.description)}</p>
                
                <div class="mt-auto pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-800">
                    ${specPreview}
                </div>
            `;
            this.grid.appendChild(card);
        });
    }

    openDetails(item) {
        // Populate Modal Headers
        document.getElementById('modal-category').textContent = item.category.toUpperCase();
        document.getElementById('modal-title').textContent = item.name;
        document.getElementById('modal-desc').textContent = item.description;
        
        // Gallery Rendering with click handlers
        const galleryContainer = document.getElementById('modal-gallery');
        if (item.images && item.images.length > 0) {
            const imagesHtml = item.images.map((imgSrc, index) => 
                `<img src="${imgSrc}" 
                     class="h-48 w-auto rounded border border-gray-200 dark:border-gray-800 snap-center flex-shrink-0 object-cover bg-gray-100 dark:bg-gray-800 cursor-pointer hover:border-red-600 transition-colors" 
                     alt="${item.name}"
                     onclick="app.openLightbox(${index})">`
            ).join('');
            
            galleryContainer.innerHTML = `
                <div class="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
                    ${imagesHtml}
                </div>
            `;
            
            // Store images for lightbox
            this.currentImages = item.images;
        } else {
            // Placeholder text if no images exist
            galleryContainer.innerHTML = `
                <div class="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center opacity-50 select-none">
                    <i data-lucide="image-off" class="text-gray-900 dark:text-gray-100 w-8 h-8 mb-2"></i>
                    <span class="text-gray-900 dark:text-gray-100 font-mono text-xs tracking-widest uppercase">No Visual Data Available</span>
                </div>
            `;
            this.currentImages = [];
        }

        // Render Specs with fixed text colors for both light/dark modes
        const specsContainer = document.getElementById('modal-specs');
        specsContainer.innerHTML = Object.entries(item.specs).map(([key, val]) => `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-700 py-2">
                <span class="text-gray-600 dark:text-gray-400 uppercase text-xs sm:text-sm font-mono tracking-wide">${this.escapeHtml(key.replace(/_/g, ' '))}</span>
                <span class="text-gray-900 dark:text-gray-100 font-bold sm:text-right text-xs sm:text-sm break-words">${this.escapeHtml(String(val))}</span>
            </div>
        `).join('');

        // Render DIY Resources section
        const diySection = document.getElementById('modal-diy-section');
        const diyContent = document.getElementById('modal-diy-content');
        
        if (item.diy_resources && item.diy_resources.length > 0) {
            diySection.classList.remove('hidden');
            diyContent.innerHTML = item.diy_resources.map(resource => `
                <a href="${this.escapeHtml(resource.url)}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 hover:border-red-600 dark:hover:border-red-600 transition-colors group">
                    <i data-lucide="${this.escapeHtml(resource.icon || 'external-link')}" class="w-5 h-5 flex-shrink-0 mt-0.5 group-hover:text-red-600"></i>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm mb-1 group-hover:text-red-600 transition-colors">${this.escapeHtml(resource.title)}</h4>
                        <p class="text-xs opacity-60 line-clamp-2">${this.escapeHtml(resource.description)}</p>
                        ${resource.type ? `<span class="inline-block mt-2 text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">${this.escapeHtml(resource.type)}</span>` : ''}
                    </div>
                    <i data-lucide="arrow-right" class="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>
            `).join('');
        } else {
            diySection.classList.add('hidden');
        }

        const jsonPre = document.getElementById('modal-json');
        jsonPre.textContent = JSON.stringify(item, null, 2);

        // Animation Open
        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modalPanel.classList.remove('translate-x-full');
        }, 10);
        document.body.style.overflow = 'hidden';

        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    closeModal() {
        this.modalPanel.classList.add('translate-x-full');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    // Lightbox functionality
    openLightbox(index) {
        if (this.currentImages.length === 0) return;
        
        this.currentImageIndex = index;
        this.updateLightboxImage();
        this.lightbox.classList.remove('hidden');
        
        // Re-initialize icons for lightbox buttons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    closeLightbox() {
        this.lightbox.classList.add('hidden');
    }

    nextImage() {
        if (this.currentImages.length === 0) return;
        this.currentImageIndex = (this.currentImageIndex + 1) % this.currentImages.length;
        this.updateLightboxImage();
    }

    prevImage() {
        if (this.currentImages.length === 0) return;
        this.currentImageIndex = (this.currentImageIndex - 1 + this.currentImages.length) % this.currentImages.length;
        this.updateLightboxImage();
    }

    updateLightboxImage() {
        this.lightboxImage.src = this.currentImages[this.currentImageIndex];
        this.lightboxCounter.textContent = `${this.currentImageIndex + 1} / ${this.currentImages.length}`;
    }

    reset() {
        this.searchInput.value = '';
        this.currentSearchQuery = '';
        this.currentCategory = 'all';
        document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
        const allButton = document.querySelector('[data-cat="all"]');
        if (allButton) {
            allButton.classList.add('active');
        }
        this.render(this.service.getAll());
    }

    // --- HELPER: COPY TO CLIPBOARD ---
    // Handles both Secure Context (HTTPS) and fallback (HTTP/Local)
    async copyToClipboardLogic(text) {
        try {
            // 1. Try modern API first (requires secure context usually)
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            // 2. Fallback for local files or non-secure contexts
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                
                // Ensure textarea is not visible but part of DOM
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
                return false;
            }
        }
    }

    async copyJson() {
        const text = document.getElementById('modal-json').textContent;
        const success = await this.copyToClipboardLogic(text);
        
        if (success) {
            // Find the button that was clicked
            const button = event.target.closest('button') || event.target;
            const originalText = button.textContent;
            
            // Visual feedback
            button.textContent = 'COPIED!';
            button.style.color = 'var(--accent-red)';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
            }, 2000);
        } else {
            alert('Failed to copy JSON. Please copy manually.');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
const app = new App();

// Run on load
window.addEventListener('DOMContentLoaded', () => {
    app.start();
});

// Expose app to window for HTML onclick handlers
window.app = app;