// --- CURRENCY CONVERSION RATES ---
const CURRENCY_RATES = {
    USD: 1,
    SAR: 3.75,
    JPY: 150
};

const CURRENCY_SYMBOLS = {
    USD: '$',
    SAR: '﷼',
    JPY: '¥'
};

// --- DATA LAYER ---
class DataService {
    constructor() {
        this.data = [];
        this.initialized = false;
    }

    async init() {
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
            const nameMatch = item.name.toLowerCase().includes(lowerQ);
            const brandMatch = item.brand.toLowerCase().includes(lowerQ);
            const descMatch = item.description.toLowerCase().includes(lowerQ);
            
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
        this.currentCurrency = 'USD';
        this.currentProductId = null;
        
        // Lightbox properties
        this.lightbox = document.getElementById('image-lightbox');
        this.lightboxImage = document.getElementById('lightbox-image');
        this.lightboxCounter = document.getElementById('lightbox-counter');
        this.currentImages = [];
        this.currentImageIndex = 0;
        
        // DIY section state
        this.diyExpanded = false;

        // Pagination
        this.PAGE_SIZE = 20;
        this.currentPage = 1;
        this.currentItems = [];
        
        this.bindEvents();
        this.initTheme();
        this.initCurrency();
    }

    async start() {
        this.showLoader(true);
        try {
            await this.service.init();
            this.showLoader(false);
            
            // Check URL for product ID
            this.checkUrlForProduct();
            
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
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentCategory = btn.dataset.cat;
                
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

        // Currency Selector - Desktop
        const currencyToggle = document.getElementById('currency-toggle');
        const currencyDropdown = document.getElementById('currency-dropdown');
        
        if (currencyToggle && currencyDropdown) {
            currencyToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                currencyDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!currencyToggle.contains(e.target) && !currencyDropdown.contains(e.target)) {
                    currencyDropdown.classList.add('hidden');
                }
            });

            const currencyButtons = currencyDropdown.querySelectorAll('button[data-currency]');
            currencyButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.changeCurrency(btn.dataset.currency);
                    currencyDropdown.classList.add('hidden');
                });
            });
        }

        // Currency Selector - Mobile
        const mobileCurrencyButtons = document.querySelectorAll('.mobile-currency-btn');
        mobileCurrencyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.changeCurrency(btn.dataset.currency);
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
                } else {
                    const creditsModal = document.getElementById('credits-modal');
                    if (creditsModal && !creditsModal.classList.contains('hidden')) {
                        this.closeCreditsModal();
                    }
                }
            }
            
            if (!this.lightbox.classList.contains('hidden')) {
                if (e.key === 'ArrowLeft') {
                    this.prevImage();
                } else if (e.key === 'ArrowRight') {
                    this.nextImage();
                }
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.productId) {
                const item = this.service.getById(e.state.productId);
                if (item) {
                    this.openDetails(item, false);
                }
            } else {
                this.closeModal(false);
            }
        });

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMore();
            });
        }
    }

    initCurrency() {
        const savedCurrency = localStorage.getItem('currency');
        if (savedCurrency && CURRENCY_RATES[savedCurrency]) {
            this.currentCurrency = savedCurrency;
            this.updateCurrencyDisplay();
        }
    }

    changeCurrency(currency) {
        this.currentCurrency = currency;
        localStorage.setItem('currency', currency);
        this.updateCurrencyDisplay();
        
        if (this.service.initialized) {
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
        }

        if (!this.modal.classList.contains('hidden') && this.currentProductId) {
            const item = this.service.getById(this.currentProductId);
            if (item) {
                this.updateModalPrice(item);
            }
        }
    }

    updateCurrencyDisplay() {
        const currencySymbol = document.getElementById('currency-symbol');
        if (currencySymbol) {
            if (this.currentCurrency === 'SAR') {
                currencySymbol.innerHTML = '<i class="sr"></i>';
            } else {
                const symbol = CURRENCY_SYMBOLS[this.currentCurrency];
                currencySymbol.textContent = symbol;
            }
        }
    }

    convertPrice(usdPrice) {
        const rate = CURRENCY_RATES[this.currentCurrency];
        const converted = usdPrice * rate;
        return Math.round(converted);
    }

    formatPrice(usdPrice) {
        const converted = this.convertPrice(usdPrice);
        
        if (this.currentCurrency === 'JPY') {
            return `¥${converted.toLocaleString()}`;
        } else if (this.currentCurrency === 'SAR') {
            return `${converted.toLocaleString()} <i class="sr"></i>`;
        } else {
            return `${converted.toLocaleString()}`;
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        const themeIcon = document.querySelector('#theme-toggle i');
        const mobileThemeIcon = document.querySelector('#mobile-theme-toggle i');
        
        if (isDark) {
            if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
            if (mobileThemeIcon) mobileThemeIcon.setAttribute('data-lucide', 'sun');
        } else {
            if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
            if (mobileThemeIcon) mobileThemeIcon.setAttribute('data-lucide', 'moon');
        }
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    initTheme() {
        // The pre-flash class on <html> was already applied by inline script.
        // Here we sync the body class to match, and remove the pre-flash class.
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

        if (isDark) {
            document.body.classList.add('dark-mode');
        }
        // Remove pre-flash class now that body is ready
        document.documentElement.classList.remove('dark-mode-pre');
        
        const themeIcon = document.querySelector('#theme-toggle i');
        const mobileThemeIcon = document.querySelector('#mobile-theme-toggle i');
        
        if (isDark) {
            if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
            if (mobileThemeIcon) mobileThemeIcon.setAttribute('data-lucide', 'sun');
        } else {
            if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
            if (mobileThemeIcon) mobileThemeIcon.setAttribute('data-lucide', 'moon');
        }
    }

    showLoader(show) {
        if (show) {
            this.loader.classList.remove('hidden');
            this.grid.classList.add('hidden');
            const loadMoreContainer = document.getElementById('load-more-container');
            if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
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
        this.currentItems = items;
        this.currentPage = 1;
        this.grid.innerHTML = '';
        this.itemCount.textContent = items.length;
        
        const noResults = document.getElementById('no-results');
        const loadMoreContainer = document.getElementById('load-more-container');

        if (items.length === 0) {
            noResults.classList.remove('hidden');
            this.grid.classList.add('hidden');
            if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
            return;
        } else {
            noResults.classList.add('hidden');
            this.grid.classList.remove('hidden');
        }

        // Show only first page (20 items)
        const pageItems = items.slice(0, this.PAGE_SIZE);
        pageItems.forEach(item => this._appendCard(item));

        // Show/hide load more button
        if (loadMoreContainer) {
            if (items.length > this.PAGE_SIZE) {
                loadMoreContainer.classList.remove('hidden');
                this._updateLoadMoreBtn();
            } else {
                loadMoreContainer.classList.add('hidden');
            }
        }
    }

    loadMore() {
        this.currentPage++;
        const start = (this.currentPage - 1) * this.PAGE_SIZE;
        const end = this.currentPage * this.PAGE_SIZE;
        const nextItems = this.currentItems.slice(start, end);

        nextItems.forEach(item => this._appendCard(item));

        const loadMoreContainer = document.getElementById('load-more-container');
        if (end >= this.currentItems.length) {
            if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
        } else {
            this._updateLoadMoreBtn();
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    _updateLoadMoreBtn() {
        const shown = Math.min(this.currentPage * this.PAGE_SIZE, this.currentItems.length);
        const remaining = this.currentItems.length - shown;
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            const next = Math.min(remaining, this.PAGE_SIZE);
            loadMoreBtn.innerHTML = `<i data-lucide="chevron-down" class="w-4 h-4"></i> LOAD ${next} MORE <span class="opacity-50 font-mono text-xs">(${remaining} remaining)</span>`;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    _appendCard(item) {
        const card = document.createElement('div');
        card.className = 'data-card p-4 sm:p-6 flex flex-col h-full cursor-pointer';
        card.onclick = () => this.openDetails(item);
        
        const specPreview = Object.entries(item.specs).slice(0, 2).map(([key, val]) => 
            `<div class="flex justify-between text-xs opacity-70 font-mono mt-1">
                <span class="uppercase truncate mr-2">${key.replace(/_/g, ' ')}</span>
                <span class="text-right flex-shrink-0">${val}</span>
            </div>`
        ).join('');

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                <span class="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-2 py-1 uppercase tracking-wider flex-shrink-0">${this.escapeHtml(item.brand)}</span>
                <span class="font-mono text-sm font-bold flex-shrink-0">${this.formatPrice(item.price)}</span>
            </div>
            <h3 class="text-lg sm:text-xl font-bold mb-2 glitch-hover line-clamp-2">${this.escapeHtml(item.name)}</h3>
            <p class="text-xs sm:text-sm opacity-60 mb-4 sm:mb-6 flex-grow line-clamp-3">${this.escapeHtml(item.description)}</p>
            
            <div class="mt-auto pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-800">
                ${specPreview}
            </div>
        `;
        this.grid.appendChild(card);
    }

    checkUrlForProduct() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product');
        
        if (productId) {
            const item = this.service.getById(productId);
            if (item) {
                this.openDetails(item, false);
            }
        }
    }

    openDetails(item, updateUrl = true) {
        this.currentProductId = item.id;
        
        this.diyExpanded = false;
        
        if (updateUrl) {
            const url = new URL(window.location);
            url.searchParams.set('product', item.id);
            window.history.pushState({ productId: item.id }, '', url);
        }
        
        document.getElementById('modal-category').textContent = item.category.toUpperCase();
        document.getElementById('modal-title').textContent = item.name;
        document.getElementById('modal-desc').textContent = item.description;
        
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
            
            this.currentImages = item.images;
        } else {
            galleryContainer.innerHTML = `
                <div class="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center opacity-50 select-none">
                    <i data-lucide="image-off" class="text-gray-900 dark:text-gray-100 w-8 h-8 mb-2"></i>
                    <span class="text-gray-900 dark:text-gray-100 font-mono text-xs tracking-widest uppercase">No Visual Data Available</span>
                </div>
            `;
            this.currentImages = [];
        }

        const specsContainer = document.getElementById('modal-specs');
        const priceSpec = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-700 py-2">
                <span class="text-gray-600 dark:text-gray-400 uppercase text-xs sm:text-sm font-mono tracking-wide">PRICE</span>
                <span class="text-gray-900 dark:text-gray-100 font-bold sm:text-right text-xs sm:text-sm break-words" id="modal-price">${this.formatPrice(item.price)}</span>
            </div>
        `;
        
        const specsHtml = Object.entries(item.specs).map(([key, val]) => `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-700 py-2">
                <span class="text-gray-600 dark:text-gray-400 uppercase text-xs sm:text-sm font-mono tracking-wide">${this.escapeHtml(key.replace(/_/g, ' '))}</span>
                <span class="text-gray-900 dark:text-gray-100 font-bold sm:text-right text-xs sm:text-sm break-words">${this.escapeHtml(String(val))}</span>
            </div>
        `).join('');
        
        specsContainer.innerHTML = priceSpec + specsHtml;

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
            diyContent.classList.add('hidden');
        } else {
            diySection.classList.add('hidden');
        }

        const jsonPre = document.getElementById('modal-json');
        jsonPre.textContent = JSON.stringify(item, null, 2);

        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modalPanel.classList.remove('translate-x-full');
        }, 10);
        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    toggleDiySection() {
        const diyContent = document.getElementById('modal-diy-content');
        const chevron = document.getElementById('diy-chevron');
        
        this.diyExpanded = !this.diyExpanded;
        
        if (this.diyExpanded) {
            diyContent.classList.remove('hidden');
            chevron.style.transform = 'rotate(180deg)';
        } else {
            diyContent.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
        }
    }

    updateModalPrice(item) {
        const priceElement = document.getElementById('modal-price');
        if (priceElement) {
            priceElement.innerHTML = this.formatPrice(item.price);
        }
    }

    closeModal(updateUrl = true) {
        this.modalPanel.classList.add('translate-x-full');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
        
        this.currentProductId = null;
        
        if (updateUrl) {
            const url = new URL(window.location);
            url.searchParams.delete('product');
            window.history.pushState({}, '', url);
        }
    }

    // --- CREDITS MODAL ---
    openCreditsModal() {
        const creditsModal = document.getElementById('credits-modal');
        const creditsPanel = document.getElementById('credits-modal-panel');
        if (!creditsModal || !creditsPanel) return;

        creditsModal.classList.remove('hidden');
        setTimeout(() => {
            creditsPanel.classList.remove('opacity-0', 'scale-95');
            creditsPanel.classList.add('opacity-100', 'scale-100');
        }, 10);
        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    closeCreditsModal() {
        const creditsModal = document.getElementById('credits-modal');
        const creditsPanel = document.getElementById('credits-modal-panel');
        if (!creditsModal || !creditsPanel) return;

        creditsPanel.classList.remove('opacity-100', 'scale-100');
        creditsPanel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            creditsModal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 200);
    }

    shareProduct() {
        const url = window.location.href;
        
        if (navigator.share) {
            const item = this.service.getById(this.currentProductId);
            navigator.share({
                title: item.name,
                text: item.description,
                url: url
            }).catch(err => {
                this.copyProductLink(url);
            });
        } else {
            this.copyProductLink(url);
        }
    }

    async copyProductLink(url) {
        const success = await this.copyToClipboardLogic(url);
        
        if (success) {
            const shareBtn = event.target.closest('button');
            if (shareBtn) {
                const icon = shareBtn.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', 'check');
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                    
                    setTimeout(() => {
                        icon.setAttribute('data-lucide', 'share-2');
                        if (typeof lucide !== 'undefined') {
                            lucide.createIcons();
                        }
                    }, 2000);
                }
            }
        } else {
            alert('Failed to copy link. Please copy manually from the address bar.');
        }
    }

    openLightbox(index) {
        if (this.currentImages.length === 0) return;
        
        this.currentImageIndex = index;
        this.updateLightboxImage();
        this.lightbox.classList.remove('hidden');
        
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

    async copyToClipboardLogic(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
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

    async copyJson() {
        const text = document.getElementById('modal-json').textContent;
        const success = await this.copyToClipboardLogic(text);
        
        if (success) {
            const button = event.target.closest('button') || event.target;
            const originalText = button.textContent;
            
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
