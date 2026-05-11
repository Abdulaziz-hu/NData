// --- CURRENCY CONVERSION RATES ---
const CURRENCY_RATES = {
    USD: 1,
    SAR: 3.75,
    JPY: 150,
    EUR: 0.92,
    GBP: 0.79
};

const CURRENCY_SYMBOLS = {
    USD: '$',
    SAR: '&#65020;',
    JPY: '&yen;',
    EUR: '&euro;',
    GBP: '&pound;'
};

// --- ID GENERATOR ---
function assignIds(data) {
    const counters = {};
    return data.map(item => {
        if (item.id) return item;
        const cat = (item.category || 'item').slice(0, 3).toLowerCase();
        counters[cat] = (counters[cat] || 0) + 1;
        const num = String(counters[cat]).padStart(6, '0');
        return { ...item, id: `${cat}-${num}` };
    });
}

// --- LANGUAGE SERVICE ---
class LangService {
    constructor() {
        this.current = localStorage.getItem('lang') || 'en';
        this.strings = {};
        this.dir = 'ltr';
    }

    async load(lang) {
        try {
            const res = await fetch(`/lang/${lang}.json`);
            if (!res.ok) throw new Error('Lang file not found');
            this.strings = await res.json();
            this.current = lang;
            this.dir = lang === 'ar' ? 'rtl' : 'ltr';
            localStorage.setItem('lang', lang);
            document.documentElement.lang = lang;
            document.documentElement.dir = this.dir;
            return true;
        } catch (e) {
            console.warn('Could not load lang:', lang, e);
            return false;
        }
    }

    t(path, fallback) {
        const keys = path.split('.');
        let val = this.strings;
        for (const k of keys) {
            if (val && typeof val === 'object') val = val[k];
            else return fallback || path;
        }
        return val || fallback || path;
    }
}

// --- DATA SERVICE ---
class DataService {
    constructor() {
        this.data = [];
        this.initialized = false;
    }

    async init() {
        const CONTENT_REPO_RAW = 'https://raw.githubusercontent.com/Abdulaziz-hu/NData-Content/main/data/data.json';
        const sources = ['/api/data/data.json', CONTENT_REPO_RAW];
        for (const url of sources) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                const raw = await response.json();
                this.data = assignIds(raw);
                this.initialized = true;
                return this.data;
            } catch (e) {
                console.warn('DataService: could not load from', url, e);
            }
        }
        throw new Error('Failed to load data from all sources');
    }

    getAll() { return this.data; }

    getByCategory(cat) {
        if (cat === 'all') return this.data;
        return this.data.filter(item => item.category === cat);
    }

    search(query) {
        if (!query || query.trim() === '') return this.data;
        const lowerQ = query.toLowerCase();
        return this.data.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(lowerQ);
            const brandMatch = item.brand.toLowerCase().includes(lowerQ);
            const descMatch = item.description.toLowerCase().includes(lowerQ);
            const specsMatch = Object.values(item.specs || {}).some(val =>
                String(val).toLowerCase().includes(lowerQ)
            );
            return nameMatch || brandMatch || descMatch || specsMatch;
        });
    }

    getById(id) {
        return this.data.find(item => item.id === id);
    }
}

// --- MAIN APP ---
class App {
    constructor() {
        this.service = new DataService();
        this.lang = new LangService();

        this.currentCategory = 'all';
        this.currentSort = 'default';
        this.currentSearchQuery = '';
        this.currentCurrency = 'USD';
        this.currentProductId = null;

        this.grid = document.getElementById('grid-container');
        this.loader = document.getElementById('loader');
        this.searchInput = document.getElementById('search-input');
        this.itemCount = document.getElementById('item-count');
        this.modal = document.getElementById('modal');
        this.modalPanel = document.getElementById('modal-panel');

        this.lightbox = document.getElementById('image-lightbox');
        this.lightboxImage = document.getElementById('lightbox-image');
        this.lightboxCounter = document.getElementById('lightbox-counter');
        this.currentImages = [];
        this.currentImageIndex = 0;

        this._hoverIntervals = new Map();
        this.diyExpanded = false;

        this.PAGE_SIZE = 20;
        this.currentPage = 1;
        this.currentItems = [];

        this.bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        this.compareList = JSON.parse(localStorage.getItem('compareList') || '[]');

        // layout.js handles theme/lang/currency/mobile-menu; we only bind data events here
        this._bindNonNavEvents();
    }

    /** Events that don't depend on injected nav DOM */
    _bindNonNavEvents() {
        let searchTimeout;
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentSearchQuery = e.target.value;
                    this.applyFiltersAndRender();
                }, 280);
            });
        }

        document.querySelectorAll('#category-filters button[data-cat]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#category-filters button[data-cat]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.cat;
                this.applyFiltersAndRender();
            });
        });

        document.querySelectorAll('[data-sort]').forEach(btn => {
            btn.addEventListener('click', () => {
                const sort = btn.dataset.sort;
                this.currentSort = this.currentSort === sort ? 'default' : sort;
                document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
                if (this.currentSort !== 'default') btn.classList.add('active');
                this.applyFiltersAndRender();
            });
        });

        document.addEventListener('keydown', (e) => {
            const tag = document.activeElement?.tagName;
            const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
            if (e.key === '/' && !inInput) {
                e.preventDefault();
                this.searchInput?.focus();
                this.searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (e.key === 'Escape') {
                if (!this.lightbox?.classList.contains('hidden')) {
                    this.closeLightbox();
                } else if (!this.modal?.classList.contains('hidden')) {
                    this.closeModal();
                } else {
                    document.getElementById('credits-modal')?.classList.add('hidden');
                    document.getElementById('bookmarks-modal')?.classList.add('hidden');
                    document.getElementById('compare-modal')?.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            }
            if (!this.lightbox?.classList.contains('hidden')) {
                if (e.key === 'ArrowLeft') this.prevImage();
                else if (e.key === 'ArrowRight') this.nextImage();
            }
        });

        window.addEventListener('popstate', (e) => {
            if (e.state?.productId) {
                const item = this.service.getById(e.state.productId);
                if (item) this.openDetails(item, false);
            } else {
                this.closeModal(false);
            }
        });

        document.getElementById('load-more-btn')?.addEventListener('click', () => this.loadMore());
    }

    /** Called after layout:ready — binds events on nav elements injected by layout.js */
    _bindIndexEvents() {
        document.getElementById('bookmarks-btn')?.addEventListener('click', () => this.openBookmarksModal());
        document.getElementById('mobile-bookmarks-btn')?.addEventListener('click', () => this.openBookmarksModal());
        document.getElementById('compare-btn')?.addEventListener('click', () => this.openCompareModal());
        document.getElementById('mobile-compare-btn')?.addEventListener('click', () => this.openCompareModal());
        // Currency and lang changes are forwarded by layout.js via __layoutOnCurrencyChange / __layoutOnLangChange
    }

    async start() {
        // lang is already loaded by layout.js; just apply translations
        this.applyTranslations();

        this.showLoader(true);
        try {
            await this.service.init();
            this.showLoader(false);
            this.checkUrlForProduct();
            this.render(this.service.getAll());
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (error) {
            this.showLoader(false);
            this.showError('Failed to load data. Please refresh the page.');
        }
    }

    applyTranslations() {
        const navMap = {
            '[data-nav="home"]': 'nav.home',
            '[data-nav="about"]': 'nav.about',
            '[data-nav="updates"]': 'nav.updates',
            '[data-nav="docs"]': 'nav.docs',
            '[data-nav="api"]': 'nav.api'
        };
        for (const [sel, key] of Object.entries(navMap)) {
            document.querySelectorAll(sel).forEach(el => { el.textContent = this.lang.t(key); });
        }

        if (this.searchInput) {
            this.searchInput.placeholder = this.lang.t('hero.search_placeholder', 'SEARCH DATABASE...');
        }

        const filterMap = {
            '[data-cat="all"]': 'filters.all',
            '[data-cat="smartphones"]': 'filters.smartphones',
            '[data-cat="laptops"]': 'filters.laptops',
            '[data-cat="wearables"]': 'filters.wearables',
            '[data-cat="components"]': 'filters.components',
            '[data-cat="tablets"]': 'filters.tablets',
            '[data-cat="cameras"]': 'filters.cameras',
            '[data-cat="gaming"]': 'filters.gaming',
            '[data-cat="monitors"]': 'filters.monitors',
            '[data-cat="networking"]': 'filters.networking'
        };
        for (const [sel, key] of Object.entries(filterMap)) {
            document.querySelectorAll(sel).forEach(el => { el.textContent = this.lang.t(key, el.textContent); });
        }

        document.querySelectorAll('[data-label="items-indexed"]').forEach(el => {
            el.textContent = this.lang.t('filters.items_indexed', 'ITEMS INDEXED');
        });

        const h1 = document.querySelector('header h1');
        if (h1) {
            const l1 = this.lang.t('hero.line1', 'P U R E.');
            const l2 = this.lang.t('hero.line2', 'R A W.');
            const l3 = this.lang.t('hero.line3', 'D A T A.');
            h1.innerHTML = `${l1}<br><span class="text-red-600">${l2}</span><br>${l3}`;
        }

        const heroDesc = document.querySelector('header p.hero-desc');
        if (heroDesc) heroDesc.textContent = this.lang.t('hero.description');

        document.querySelectorAll('[data-hint="keyboard"]').forEach(el => {
            el.textContent = this.lang.t('keyboard.hint', 'Press / to search');
        });
    }


    applyFiltersAndRender() {
        let results = this.currentSearchQuery
            ? this.service.search(this.currentSearchQuery)
            : this.service.getAll();

        if (this.currentCategory !== 'all') {
            results = results.filter(item => item.category === this.currentCategory);
        }

        results = this._sortItems(results);
        this.render(results);
    }

    _sortItems(items) {
        const arr = [...items];
        switch (this.currentSort) {
            case 'price-asc':  return arr.sort((a, b) => a.price - b.price);
            case 'price-desc': return arr.sort((a, b) => b.price - a.price);
            case 'date-new':   return arr.sort((a, b) => (b.date_added || '') > (a.date_added || '') ? 1 : -1);
            case 'date-old':   return arr.sort((a, b) => (a.date_added || '') > (b.date_added || '') ? 1 : -1);
            default:           return arr;
        }
    }

    initCurrency() {
        const saved = localStorage.getItem('currency');
        if (saved && CURRENCY_RATES[saved]) {
            this.currentCurrency = saved;
            this.updateCurrencyDisplay();
        }
    }

    changeCurrency(currency) {
        this.currentCurrency = currency;
        localStorage.setItem('currency', currency);
        this.updateCurrencyDisplay();
        if (this.service.initialized) this.applyFiltersAndRender();
        if (!this.modal.classList.contains('hidden') && this.currentProductId) {
            const item = this.service.getById(this.currentProductId);
            if (item) this.updateModalPrice(item);
        }
    }

    updateCurrencyDisplay() {
        document.querySelectorAll('#currency-symbol').forEach(el => {
            if (this.currentCurrency === 'SAR') {
                el.innerHTML = '<i class="sr"></i>';
            } else {
                el.innerHTML = CURRENCY_SYMBOLS[this.currentCurrency] || this.currentCurrency;
            }
        });
    }

    convertPrice(usdPrice) {
        return Math.round(usdPrice * (CURRENCY_RATES[this.currentCurrency] || 1));
    }

    formatPrice(usdPrice) {
        const converted = this.convertPrice(usdPrice);
        if (this.currentCurrency === 'JPY') return `&yen;${converted.toLocaleString()}`;
        if (this.currentCurrency === 'SAR') return `${converted.toLocaleString()} <i class="sr"></i>`;
        if (this.currentCurrency === 'EUR') return `&euro;${converted.toLocaleString()}`;
        if (this.currentCurrency === 'GBP') return `&pound;${converted.toLocaleString()}`;
        return `$${converted.toLocaleString()}`;
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this._updateThemeIcons(isDark);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    initTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const isDark = saved === 'dark' || (!saved && prefersDark);
        if (isDark) document.body.classList.add('dark-mode');
        document.documentElement.classList.remove('dark-mode-pre');
        this._updateThemeIcons(isDark);
    }

    _updateThemeIcons(isDark) {
        document.querySelectorAll('[data-theme-icon]').forEach(el => {
            el.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        });
    }

    showLoader(show) {
        if (show) {
            this.loader?.classList.remove('hidden');
            this.grid?.classList.add('hidden');
            document.getElementById('load-more-container')?.classList.add('hidden');
        } else {
            this.loader?.classList.add('hidden');
            this.grid?.classList.remove('hidden');
        }
    }

    showError(message) {
        this.grid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <h3 class="text-2xl sm:text-3xl mb-4 text-red-600">ERROR</h3>
                <p class="opacity-60 font-mono">${message}</p>
            </div>`;
    }

    render(items) {
        this.currentItems = items;
        this.currentPage = 1;
        this.grid.innerHTML = '';
        if (this.itemCount) this.itemCount.textContent = items.length;

        const noResults = document.getElementById('no-results');
        const loadMoreContainer = document.getElementById('load-more-container');

        if (items.length === 0) {
            noResults?.classList.remove('hidden');
            this.grid.classList.add('hidden');
            loadMoreContainer?.classList.add('hidden');
            return;
        }

        noResults?.classList.add('hidden');
        this.grid.classList.remove('hidden');

        items.slice(0, this.PAGE_SIZE).forEach(item => this._appendCard(item));

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
        this.currentItems.slice(start, end).forEach(item => this._appendCard(item));

        const loadMoreContainer = document.getElementById('load-more-container');
        if (end >= this.currentItems.length) {
            loadMoreContainer?.classList.add('hidden');
        } else {
            this._updateLoadMoreBtn();
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    _updateLoadMoreBtn() {
        const shown = Math.min(this.currentPage * this.PAGE_SIZE, this.currentItems.length);
        const remaining = this.currentItems.length - shown;
        const btn = document.getElementById('load-more-btn');
        if (btn) {
            const next = Math.min(remaining, this.PAGE_SIZE);
            btn.innerHTML = `<i data-lucide="chevron-down" class="w-4 h-4"></i> LOAD ${next} MORE <span class="opacity-50 font-mono text-xs">(${remaining} remaining)</span>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    _appendCard(item) {
        const card = document.createElement('div');
        card.className = 'data-card p-4 sm:p-6 flex flex-col h-full cursor-pointer relative';
        card.dataset.itemId = item.id;

        const isBookmarked = this.bookmarks.includes(item.id);
        const isInCompare = this.compareList.includes(item.id);

        const specPreview = Object.entries(item.specs || {}).slice(0, 2).map(([key, val]) =>
            `<div class="flex justify-between text-xs opacity-70 font-mono mt-1">
                <span class="uppercase truncate mr-2">${key.replace(/_/g, ' ')}</span>
                <span class="text-right flex-shrink-0">${val}</span>
            </div>`
        ).join('');

        const hasImages = item.images && item.images.length > 0;
        const imgHtml = hasImages
            ? `<div class="card-image-wrap relative overflow-hidden mb-3" style="height:140px;">
                <div class="halftone-overlay absolute inset-0 z-10 pointer-events-none"></div>
                <div class="card-image-track flex h-full" style="transition:transform 0.4s ease;">
                    ${item.images.map(src =>
                        `<img src="${src}" alt="${this.escapeHtml(item.name)}" class="card-img h-full w-full object-cover flex-shrink-0" loading="lazy">`
                    ).join('')}
                </div>
               </div>`
            : `<div class="card-image-placeholder mb-3 flex items-center justify-center border border-dashed opacity-20" style="height:80px;">
                <i data-lucide="image-off" class="w-6 h-6"></i>
               </div>`;

        card.innerHTML = `
            ${imgHtml}
            <div class="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                <span class="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-2 py-1 uppercase tracking-wider flex-shrink-0">${this.escapeHtml(item.brand)}</span>
                <span class="font-mono text-sm font-bold flex-shrink-0 card-price">${this.formatPrice(item.price)}</span>
            </div>
            <h3 class="text-lg sm:text-xl font-bold mb-2 glitch-hover line-clamp-2">${this.escapeHtml(item.name)}</h3>
            <p class="text-xs sm:text-sm opacity-60 mb-4 sm:mb-6 flex-grow line-clamp-3">${this.escapeHtml(item.description)}</p>

            <div class="mt-auto pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-800">
                ${specPreview}
                <div class="flex gap-1 mt-3 justify-end">
                    <button class="card-action-btn copy-specs-btn" title="Copy Specs" onclick="event.stopPropagation(); app.copySpecs('${item.id}', this)">
                        <i data-lucide="copy" class="w-3 h-3"></i>
                    </button>
                    <button class="card-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}" title="Bookmark" onclick="event.stopPropagation(); app.toggleBookmark('${item.id}', this)">
                        <i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}" class="w-3 h-3"></i>
                    </button>
                    <button class="card-action-btn compare-btn ${isInCompare ? 'active' : ''}" title="Compare" onclick="event.stopPropagation(); app.toggleCompare('${item.id}', this)">
                        <i data-lucide="bar-chart-2" class="w-3 h-3"></i>
                    </button>
                </div>
            </div>`;

        card.addEventListener('click', () => this.openDetails(item));

        if (hasImages && item.images.length > 1) {
            const track = card.querySelector('.card-image-track');
            const overlay = card.querySelector('.halftone-overlay');
            let hoverIdx = 0;
            card.addEventListener('mouseenter', () => {
                if (overlay) overlay.style.opacity = '0';
                const interval = setInterval(() => {
                    hoverIdx = (hoverIdx + 1) % item.images.length;
                    if (track) track.style.transform = `translateX(-${hoverIdx * 100}%)`;
                }, 900);
                this._hoverIntervals.set(card, interval);
            });
            card.addEventListener('mouseleave', () => {
                if (overlay) overlay.style.opacity = '1';
                clearInterval(this._hoverIntervals.get(card));
                this._hoverIntervals.delete(card);
                hoverIdx = 0;
                if (track) track.style.transform = 'translateX(0)';
            });
        } else if (hasImages) {
            const overlay = card.querySelector('.halftone-overlay');
            card.addEventListener('mouseenter', () => { if (overlay) overlay.style.opacity = '0'; });
            card.addEventListener('mouseleave', () => { if (overlay) overlay.style.opacity = '1'; });
        }

        this.grid.appendChild(card);
    }

    async copySpecs(itemId, btn) {
        const item = this.service.getById(itemId);
        if (!item) return;
        const text = [
            `${item.brand} - ${item.name}`,
            `Price: ${this.formatPrice(item.price).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '')}`,
            '',
            ...Object.entries(item.specs || {}).map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`)
        ].join('\n');

        const success = await this.copyToClipboardLogic(text);
        if (success) {
            const origHtml = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i>`;
            btn.classList.add('active');
            if (typeof lucide !== 'undefined') lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = origHtml;
                btn.classList.remove('active');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 2000);
        }
    }

    toggleBookmark(itemId, btn) {
        const idx = this.bookmarks.indexOf(itemId);
        if (idx === -1) {
            this.bookmarks.push(itemId);
            btn.classList.add('active');
            btn.innerHTML = `<i data-lucide="bookmark-check" class="w-3 h-3"></i>`;
        } else {
            this.bookmarks.splice(idx, 1);
            btn.classList.remove('active');
            btn.innerHTML = `<i data-lucide="bookmark" class="w-3 h-3"></i>`;
        }
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
        this._updateBookmarksBadge();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    _updateBookmarksBadge() {
        const badge = document.getElementById('bookmarks-badge');
        if (badge) {
            badge.textContent = this.bookmarks.length;
            badge.classList.toggle('hidden', this.bookmarks.length === 0);
        }
    }

    openBookmarksModal() {
        const modal = document.getElementById('bookmarks-modal');
        if (!modal) return;
        const list = document.getElementById('bookmarks-list');
        if (list) {
            if (this.bookmarks.length === 0) {
                list.innerHTML = `<p class="opacity-50 font-mono text-sm text-center py-8">No bookmarks yet. Click the bookmark icon on any item.</p>`;
            } else {
                list.innerHTML = this.bookmarks.map(id => {
                    const item = this.service.getById(id);
                    if (!item) return '';
                    return `<div class="flex items-center justify-between border border-gray-200 dark:border-gray-700 p-3 hover:border-red-600 transition-colors cursor-pointer group" onclick="app.openDetails(app.service.getById('${id}')); app.closeBookmarksModal()">
                        <div class="flex-1 min-w-0 mr-3">
                            <span class="text-xs font-bold opacity-50">${this.escapeHtml(item.brand)}</span>
                            <p class="font-bold text-sm truncate group-hover:text-red-600 transition-colors">${this.escapeHtml(item.name)}</p>
                            <span class="font-mono text-xs opacity-60">${this.formatPrice(item.price).replace(/<[^>]+>/g, '')}</span>
                        </div>
                        <button onclick="event.stopPropagation(); app.removeBookmark('${id}')" class="flex-shrink-0 opacity-40 hover:opacity-100 hover:text-red-600 transition-all">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>`;
                }).join('');
            }
        }
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    removeBookmark(id) {
        this.bookmarks = this.bookmarks.filter(b => b !== id);
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
        this._updateBookmarksBadge();
        this.openBookmarksModal();
        const card = this.grid.querySelector(`[data-item-id="${id}"]`);
        if (card) {
            const btn = card.querySelector('.bookmark-btn');
            if (btn) {
                btn.classList.remove('active');
                btn.innerHTML = `<i data-lucide="bookmark" class="w-3 h-3"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    }

    closeBookmarksModal() {
        document.getElementById('bookmarks-modal')?.classList.add('hidden');
        document.body.style.overflow = '';
    }

    toggleCompare(itemId, btn) {
        const idx = this.compareList.indexOf(itemId);
        if (idx === -1) {
            if (this.compareList.length >= 4) {
                this._showToast('Max 4 items can be compared at once.');
                return;
            }
            this.compareList.push(itemId);
            btn.classList.add('active');
        } else {
            this.compareList.splice(idx, 1);
            btn.classList.remove('active');
        }
        localStorage.setItem('compareList', JSON.stringify(this.compareList));
        this._updateCompareBadge();
    }

    _updateCompareBadge() {
        const badge = document.getElementById('compare-badge');
        if (badge) {
            badge.textContent = this.compareList.length;
            badge.classList.toggle('hidden', this.compareList.length === 0);
        }
    }

    openCompareModal() {
        const modal = document.getElementById('compare-modal');
        if (!modal) return;
        const container = document.getElementById('compare-container');

        if (!container) { modal.classList.remove('hidden'); return; }

        if (this.compareList.length === 0) {
            container.innerHTML = `<p class="opacity-50 font-mono text-sm text-center py-8">Add items to compare (up to 4). Click the bar-chart icon on any card.</p>`;
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            return;
        }

        const items = this.compareList.map(id => this.service.getById(id)).filter(Boolean);
        const allKeys = [...new Set(items.flatMap(item => Object.keys(item.specs || {})))];

        container.innerHTML = `
            <div class="overflow-x-auto w-full">
                <table class="w-full text-xs font-mono border-collapse min-w-[500px]">
                    <thead>
                        <tr>
                            <th class="text-left p-2 border-b border-gray-300 dark:border-gray-700 opacity-50 w-28 font-normal">SPEC</th>
                            ${items.map(item => `
                                <th class="text-left p-2 border-b border-gray-300 dark:border-gray-700 font-normal">
                                    <div class="flex items-start justify-between gap-1">
                                        <div>
                                            <div class="text-xs opacity-50">${this.escapeHtml(item.brand)}</div>
                                            <div class="font-bold text-sm">${this.escapeHtml(item.name)}</div>
                                        </div>
                                        <button onclick="app.removeFromCompare('${item.id}')" class="opacity-40 hover:opacity-100 hover:text-red-600 flex-shrink-0 pt-1">
                                            <i data-lucide="x" class="w-3 h-3"></i>
                                        </button>
                                    </div>
                                </th>`).join('')}
                        </tr>
                        <tr>
                            <td class="p-2 border-b border-gray-300 dark:border-gray-700 opacity-50 uppercase">Price</td>
                            ${items.map(item => `<td class="p-2 border-b border-gray-300 dark:border-gray-700 font-bold">${this.formatPrice(item.price).replace(/<[^>]+>/g, '')}</td>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${allKeys.map(key => `
                            <tr class="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <td class="p-2 border-b border-gray-200 dark:border-gray-800 opacity-60 uppercase">${key.replace(/_/g, ' ')}</td>
                                ${items.map(item => `<td class="p-2 border-b border-gray-200 dark:border-gray-800">${this.escapeHtml(String(item.specs?.[key] || '-'))}</td>`).join('')}
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    removeFromCompare(id) {
        this.compareList = this.compareList.filter(c => c !== id);
        localStorage.setItem('compareList', JSON.stringify(this.compareList));
        this._updateCompareBadge();
        this.openCompareModal();
        const card = this.grid.querySelector(`[data-item-id="${id}"]`);
        if (card) card.querySelector('.compare-btn')?.classList.remove('active');
    }

    closeCompareModal() {
        document.getElementById('compare-modal')?.classList.add('hidden');
        document.body.style.overflow = '';
    }

    clearCompare() {
        this.compareList.forEach(id => {
            const card = this.grid.querySelector(`[data-item-id="${id}"]`);
            if (card) card.querySelector('.compare-btn')?.classList.remove('active');
        });
        this.compareList = [];
        localStorage.setItem('compareList', JSON.stringify(this.compareList));
        this._updateCompareBadge();
        this.closeCompareModal();
    }

    _showToast(msg) {
        let toast = document.getElementById('ndata-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ndata-toast';
            toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-black text-white font-mono text-xs px-4 py-2 rounded transition-opacity duration-200 pointer-events-none';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    }

    checkUrlForProduct() {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('product');
        if (productId) {
            const item = this.service.getById(productId);
            if (item) this.openDetails(item, false);
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
            this.currentImages = item.images;
            galleryContainer.innerHTML = `
                <div class="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
                    ${item.images.map((src, i) =>
                        `<img src="${src}" class="h-48 w-auto rounded border border-gray-200 dark:border-gray-800 snap-center flex-shrink-0 object-cover bg-gray-100 dark:bg-gray-800 cursor-pointer hover:border-red-600 transition-colors"
                              alt="${this.escapeHtml(item.name)}"
                              onclick="app.openLightbox(${i})">`
                    ).join('')}
                </div>`;
        } else {
            this.currentImages = [];
            galleryContainer.innerHTML = `
                <div class="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center opacity-50 select-none">
                    <i data-lucide="image-off" class="text-gray-900 dark:text-gray-100 w-8 h-8 mb-2"></i>
                    <span class="text-gray-900 dark:text-gray-100 font-mono text-xs tracking-widest uppercase">No Visual Data Available</span>
                </div>`;
        }

        const modalBookmarkBtn = document.getElementById('modal-bookmark-btn');
        if (modalBookmarkBtn) {
            const isBookmarked = this.bookmarks.includes(item.id);
            modalBookmarkBtn.innerHTML = `<i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}" class="w-6 h-6 sm:w-7 sm:h-7"></i>`;
            modalBookmarkBtn.onclick = () => {
                const idx = this.bookmarks.indexOf(item.id);
                if (idx === -1) {
                    this.bookmarks.push(item.id);
                    modalBookmarkBtn.innerHTML = `<i data-lucide="bookmark-check" class="w-6 h-6 sm:w-7 sm:h-7"></i>`;
                } else {
                    this.bookmarks.splice(idx, 1);
                    modalBookmarkBtn.innerHTML = `<i data-lucide="bookmark" class="w-6 h-6 sm:w-7 sm:h-7"></i>`;
                }
                localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
                this._updateBookmarksBadge();
                const card = this.grid.querySelector(`[data-item-id="${item.id}"]`);
                if (card) {
                    const btn = card.querySelector('.bookmark-btn');
                    if (btn) {
                        const isNowBookmarked = this.bookmarks.includes(item.id);
                        btn.classList.toggle('active', isNowBookmarked);
                        btn.innerHTML = `<i data-lucide="${isNowBookmarked ? 'bookmark-check' : 'bookmark'}" class="w-3 h-3"></i>`;
                    }
                }
                if (typeof lucide !== 'undefined') lucide.createIcons();
            };
        }

        const specsContainer = document.getElementById('modal-specs');
        const priceRow = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-700 py-2">
                <span class="text-gray-600 dark:text-gray-400 uppercase text-xs sm:text-sm font-mono tracking-wide">PRICE</span>
                <span class="text-gray-900 dark:text-gray-100 font-bold sm:text-right text-xs sm:text-sm break-words" id="modal-price">${this.formatPrice(item.price)}</span>
            </div>`;
        const specsHtml = Object.entries(item.specs || {}).map(([key, val]) => `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-700 py-2">
                <span class="text-gray-600 dark:text-gray-400 uppercase text-xs sm:text-sm font-mono tracking-wide">${this.escapeHtml(key.replace(/_/g, ' '))}</span>
                <span class="text-gray-900 dark:text-gray-100 font-bold sm:text-right text-xs sm:text-sm break-words">${this.escapeHtml(String(val))}</span>
            </div>`).join('');
        specsContainer.innerHTML = priceRow + specsHtml;

        const diySection = document.getElementById('modal-diy-section');
        const diyContent = document.getElementById('modal-diy-content');
        if (item.diy_resources && item.diy_resources.length > 0) {
            diySection?.classList.remove('hidden');
            if (diyContent) {
                diyContent.innerHTML = item.diy_resources.map(r => `
                    <a href="${this.escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer"
                       class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 hover:border-red-600 dark:hover:border-red-600 transition-colors group">
                        <i data-lucide="${this.escapeHtml(r.icon || 'external-link')}" class="w-5 h-5 flex-shrink-0 mt-0.5 group-hover:text-red-600"></i>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-sm mb-1 group-hover:text-red-600 transition-colors">${this.escapeHtml(r.title)}</h4>
                            <p class="text-xs opacity-60 line-clamp-2">${this.escapeHtml(r.description)}</p>
                            ${r.type ? `<span class="inline-block mt-2 text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">${this.escapeHtml(r.type)}</span>` : ''}
                        </div>
                        <i data-lucide="arrow-right" class="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </a>`).join('');
                diyContent.classList.add('hidden');
            }
        } else {
            diySection?.classList.add('hidden');
        }

        document.getElementById('modal-json').textContent = JSON.stringify(item, null, 2);

        this.modal.classList.remove('hidden');
        setTimeout(() => this.modalPanel.classList.remove('translate-x-full'), 10);
        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    toggleDiySection() {
        const diyContent = document.getElementById('modal-diy-content');
        const chevron = document.getElementById('diy-chevron');
        this.diyExpanded = !this.diyExpanded;
        diyContent?.classList.toggle('hidden', !this.diyExpanded);
        if (chevron) chevron.style.transform = this.diyExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    updateModalPrice(item) {
        const el = document.getElementById('modal-price');
        if (el) el.innerHTML = this.formatPrice(item.price);
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

    openCreditsModal() {
        const modal = document.getElementById('credits-modal');
        const panel = document.getElementById('credits-modal-panel');
        if (!modal || !panel) return;
        modal.classList.remove('hidden');
        setTimeout(() => {
            panel.classList.remove('opacity-0', 'scale-95');
            panel.classList.add('opacity-100', 'scale-100');
        }, 10);
        document.body.style.overflow = 'hidden';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    closeCreditsModal() {
        const modal = document.getElementById('credits-modal');
        const panel = document.getElementById('credits-modal-panel');
        if (!modal || !panel) return;
        panel.classList.remove('opacity-100', 'scale-100');
        panel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => { modal.classList.add('hidden'); document.body.style.overflow = ''; }, 200);
    }

    openLightbox(index) {
        if (this.currentImages.length === 0) return;
        this.currentImageIndex = index;
        this.updateLightboxImage();
        this.lightbox.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    closeLightbox() { this.lightbox.classList.add('hidden'); }

    nextImage() {
        if (!this.currentImages.length) return;
        this.currentImageIndex = (this.currentImageIndex + 1) % this.currentImages.length;
        this.updateLightboxImage();
    }

    prevImage() {
        if (!this.currentImages.length) return;
        this.currentImageIndex = (this.currentImageIndex - 1 + this.currentImages.length) % this.currentImages.length;
        this.updateLightboxImage();
    }

    updateLightboxImage() {
        this.lightboxImage.src = this.currentImages[this.currentImageIndex];
        this.lightboxCounter.textContent = `${this.currentImageIndex + 1} / ${this.currentImages.length}`;
    }

    shareProduct() {
        const url = window.location.href;
        const item = this.service.getById(this.currentProductId);
        if (navigator.share && item) {
            navigator.share({ title: item.name, text: item.description, url }).catch(() => this.copyProductLink(url));
        } else {
            this.copyProductLink(url);
        }
    }

    async copyProductLink(url) {
        const success = await this.copyToClipboardLogic(url);
        if (success) {
            const btn = document.querySelector('[onclick="app.shareProduct()"]');
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', 'check');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    setTimeout(() => {
                        icon.setAttribute('data-lucide', 'share-2');
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }, 2000);
                }
            }
        }
    }

    reset() {
        if (this.searchInput) this.searchInput.value = '';
        this.currentSearchQuery = '';
        this.currentCategory = 'all';
        this.currentSort = 'default';
        document.querySelectorAll('#category-filters button[data-cat]').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-cat="all"]')?.classList.add('active');
        document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
        if (this.service.initialized) this.render(this.service.getAll());
    }

    async copyToClipboardLogic(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {}
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch {
            return false;
        }
    }

    async copyJson() {
        const text = document.getElementById('modal-json')?.textContent;
        if (!text) return;
        const success = await this.copyToClipboardLogic(text);
        const button = document.querySelector('[onclick="app.copyJson()"]');
        if (button) {
            const orig = button.textContent;
            button.textContent = success ? 'COPIED!' : 'FAILED';
            button.style.color = 'var(--accent-red)';
            setTimeout(() => { button.textContent = orig; button.style.color = ''; }, 2000);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const d = document.createElement('div');
        d.textContent = String(text);
        return d.innerHTML;
    }
}

const app = new App();
window.app = app;

// layout.js injects nav/footer and handles theme/lang/currency/mobile-menu.
// We start after layout:ready so the nav DOM is present.
document.addEventListener('layout:ready', (e) => {
    // Sync lang state from layout into app's LangService
    const { lang, strings } = e.detail;
    if (lang && strings) {
        app.lang.current = lang;
        app.lang.strings = strings;
        app.lang.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
    // Sync currency from localStorage
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency && CURRENCY_RATES[savedCurrency]) {
        app.currentCurrency = savedCurrency;
    }

    // Re-bind app-specific events now that nav DOM exists
    app._bindIndexEvents();

    app.start().then(() => {
        app._updateBookmarksBadge();
        app._updateCompareBadge();
    });
});
