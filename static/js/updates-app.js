// --- DATA LAYER ---
class UpdatesService {
    constructor() {
        this.data = [];
        this.initialized = false;
    }

    async init() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('../../api/data/updates-data.json');
                if (!response.ok) {
                    throw new Error('Failed to load updates data');
                }
                this.data = await response.json();
                // Sort by date (newest first)
                this.data.sort((a, b) => new Date(b.date) - new Date(a.date));
                this.initialized = true;
                resolve(this.data);
            } catch (error) {
                console.error('Error loading updates data:', error);
                reject(error);
            }
        });
    }

    getAll() { 
        return this.data; 
    }

    getByType(type) {
        if (type === 'all') return this.data;
        return this.data.filter(item => item.type === type);
    }

    getFeatured() {
        return this.data.filter(item => item.featured);
    }

    search(query) {
        if (!query || query.trim() === '') {
            return this.data;
        }
        const lowerQ = query.toLowerCase();
        return this.data.filter(item => {
            const titleMatch = item.title.toLowerCase().includes(lowerQ);
            const excerptMatch = item.excerpt.toLowerCase().includes(lowerQ);
            const authorMatch = item.author.toLowerCase().includes(lowerQ);
            const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(lowerQ));
            
            // Search in content blocks
            const contentMatch = item.content.some(block => {
                if (block.type === 'text') {
                    return block.value.toLowerCase().includes(lowerQ);
                }
                return false;
            });
            
            return titleMatch || excerptMatch || contentMatch || authorMatch || tagsMatch;
        });
    }

    getById(id) {
        return this.data.find(item => item.id === id);
    }
}

// --- UI LAYER ---
class UpdatesApp {
    constructor() {
        this.service = new UpdatesService();
        this.currentType = 'all';
        this.grid = document.getElementById('grid-container');
        this.loader = document.getElementById('loader');
        this.searchInput = document.getElementById('search-input');
        this.itemCount = document.getElementById('item-count');
        this.modal = document.getElementById('modal');
        this.modalPanel = document.getElementById('modal-panel');
        this.filtersSection = document.getElementById('filters-section');
        this.currentSearchQuery = '';
        this.currentItem = null;
        
        this.bindEvents();
        this.initTheme();
        this.initStickyFilters();
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

            // Check for hash in URL and open post if exists
            this.checkUrlHash();
        } catch (error) {
            this.showLoader(false);
            this.showError('Failed to load updates. Please refresh the page.');
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

        // Type Filters
        const buttons = document.querySelectorAll('#category-filters button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Toggle active class
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Filter
                this.currentType = btn.dataset.cat;
                
                // If there's a search query, apply both filters
                if (this.currentSearchQuery) {
                    const searchResults = this.service.search(this.currentSearchQuery);
                    const filtered = this.currentType === 'all' 
                        ? searchResults 
                        : searchResults.filter(item => item.type === this.currentType);
                    this.render(filtered);
                } else {
                    const results = this.service.getByType(this.currentType);
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

        // Keyboard navigation for modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.closeModal();
            }
        });

        // Hash change listener
        window.addEventListener('hashchange', () => {
            this.checkUrlHash();
        });
    }

    initStickyFilters() {
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                this.filtersSection.classList.add('scrolled');
            } else {
                this.filtersSection.classList.remove('scrolled');
            }
            
            lastScroll = currentScroll;
        });
    }

    checkUrlHash() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const item = this.service.getById(hash);
            if (item) {
                this.openDetails(item);
            }
        }
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
                <h3 class="text-2xl sm:text-3xl mb-4 text-red-600 brand-font">ERROR</h3>
                <p class="opacity-60 font-mono">${message}</p>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
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
            
            const featuredBadge = item.featured 
                ? '<span class="text-xs font-bold text-red-600 uppercase tracking-wider">★ FEATURED</span>' 
                : '';

            card.innerHTML = `
                <div class="flex justify-between items-start mb-3 gap-2">
                    <span class="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-2 py-1 uppercase tracking-wider flex-shrink-0">${this.escapeHtml(item.type)}</span>
                    <span class="font-mono text-xs opacity-60 flex-shrink-0">${this.formatDate(item.date)}</span>
                </div>
                ${featuredBadge ? `<div class="mb-2">${featuredBadge}</div>` : ''}
                <h3 class="text-lg sm:text-xl font-bold mb-2 glitch-hover line-clamp-2">${this.escapeHtml(item.title)}</h3>
                <p class="text-xs sm:text-sm opacity-60 mb-4 flex-grow line-clamp-3">${this.escapeHtml(item.excerpt)}</p>
                
                <div class="mt-auto pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <span class="text-xs opacity-60 font-mono">${this.escapeHtml(item.author)}</span>
                    <div class="flex gap-1 flex-wrap justify-end">
                        ${item.tags.slice(0, 2).map(tag => 
                            `<span class="text-xs px-2 py-1 tag-badge">#${this.escapeHtml(tag)}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
            this.grid.appendChild(card);
        });
    }

    renderContentBlock(block) {
        switch (block.type) {
            case 'text':
                return `<p class="content-text text-sm sm:text-base opacity-80">${this.escapeHtml(block.value)}</p>`;
            
            case 'image':
                return `
                    <div class="media-container">
                        <img src="${this.escapeHtml(block.value)}" alt="${this.escapeHtml(block.caption || '')}" loading="lazy" />
                        ${block.caption ? `<p class="media-caption">${this.escapeHtml(block.caption)}</p>` : ''}
                    </div>
                `;
            
            case 'video':
                return `
                    <div class="media-container">
                        <iframe 
                            src="${this.escapeHtml(block.value)}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                        ></iframe>
                        ${block.caption ? `<p class="media-caption">${this.escapeHtml(block.caption)}</p>` : ''}
                    </div>
                `;
            
            case 'audio':
                return `
                    <div class="media-container">
                        <audio controls>
                            <source src="${this.escapeHtml(block.value)}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                        ${block.caption ? `<p class="media-caption">${this.escapeHtml(block.caption)}</p>` : ''}
                    </div>
                `;
            
            case 'link':
                return `
                    <a href="${this.escapeHtml(block.value)}" target="_blank" rel="noopener noreferrer" class="content-link">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                        <span>${this.escapeHtml(block.text || block.value)}</span>
                    </a>
                `;
            
            default:
                return '';
        }
    }

    openDetails(item) {
        // Update URL hash
        window.history.pushState(null, '', `#${item.id}`);
        
        // Populate Modal
        document.getElementById('modal-type').textContent = item.type.toUpperCase();
        document.getElementById('modal-title').textContent = item.title;
        document.getElementById('modal-date').textContent = this.formatDate(item.date);
        document.getElementById('modal-author').textContent = `By ${item.author}`;
        
        // Render Tags
        const tagsContainer = document.getElementById('modal-tags');
        tagsContainer.innerHTML = item.tags.map(tag => 
            `<span class="text-xs px-3 py-1 tag-badge font-mono">#${this.escapeHtml(tag)}</span>`
        ).join('');

        // Render Content Blocks
        const contentContainer = document.getElementById('modal-content');
        contentContainer.innerHTML = item.content.map(block => this.renderContentBlock(block)).join('');

        // Store current item for sharing
        this.currentItem = item;

        // Animation Open
        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modalPanel.classList.remove('translate-x-full');
            this.modalPanel.scrollTop = 0;
        }, 10);
        document.body.style.overflow = 'hidden';

        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    closeModal() {
        // Remove hash from URL
        window.history.pushState(null, '', window.location.pathname);
        
        this.modalPanel.classList.add('translate-x-full');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    async sharePost() {
        if (!this.currentItem) return;

        const shareData = {
            title: this.currentItem.title,
            text: this.currentItem.excerpt,
            url: window.location.origin + window.location.pathname + '#' + this.currentItem.id
        };

        try {
            // Try native share API first (mobile devices)
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: copy to clipboard
                const shareText = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
                await this.copyToClipboard(shareText);
                this.showFeedback('Post details copied to clipboard!');
            }
        } catch (err) {
            // User cancelled or error occurred
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
                this.showFeedback('Failed to share post', true);
            }
        }
    }

    async copyLink() {
        if (!this.currentItem) return;

        const url = window.location.origin + window.location.pathname + '#' + this.currentItem.id;
        const success = await this.copyToClipboard(url);
        
        if (success) {
            this.showFeedback('Link copied to clipboard!');
        } else {
            this.showFeedback('Failed to copy link', true);
        }
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            // Fallback
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
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

    showFeedback(message, isError = false) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'fixed bottom-8 right-8 glass-panel px-6 py-3 font-mono text-sm z-[80] share-feedback';
        feedback.style.maxWidth = '300px';
        
        if (isError) {
            feedback.style.borderColor = 'var(--accent-red)';
            feedback.style.color = 'var(--accent-red)';
        }
        
        feedback.textContent = message;
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(feedback);
            }, 300);
        }, 2500);
    }

    reset() {
        this.searchInput.value = '';
        this.currentSearchQuery = '';
        this.currentType = 'all';
        document.querySelectorAll('#category-filters button').forEach(b => b.classList.remove('active'));
        const allButton = document.querySelector('[data-cat="all"]');
        if (allButton) {
            allButton.classList.add('active');
        }
        this.render(this.service.getAll());
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
const app = new UpdatesApp();

// Run on load
window.addEventListener('DOMContentLoaded', () => {
    app.start();
});

// Expose app to window for HTML onclick handlers
window.app = app;