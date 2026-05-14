/**
 * updates-app.js
 * Fetches blog/news/updates markdown from the NData-Content GitHub repo
 * and renders them as cards + a slide-in modal.
 *
 * Content repo: https://github.com/Abdulaziz-hu/NData-Content (public)
 * Raw base URL:  https://raw.githubusercontent.com/Abdulaziz-hu/NData-Content/main
 * API base URL:  https://api.github.com/repos/Abdulaziz-hu/NData-Content/contents
 */

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const CONTENT_REPO_OWNER = 'Abdulaziz-hu';
const CONTENT_REPO_NAME  = 'NData-Content';
const CONTENT_REPO_BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${CONTENT_REPO_OWNER}/${CONTENT_REPO_NAME}/${CONTENT_REPO_BRANCH}`;
const API_BASE = `https://api.github.com/repos/${CONTENT_REPO_OWNER}/${CONTENT_REPO_NAME}/contents`;

// ─── MARKDOWN PARSER (lightweight, no dependencies) ─────────────────────────
function parseMarkdown(md) {
    // Extract frontmatter
    let frontmatter = {};
    let body = md;
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (fmMatch) {
        const lines = fmMatch[1].split('\n');
        for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).trim();
                const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
                frontmatter[key] = val;
            }
        }
        body = fmMatch[2];
    }

    // Convert markdown body to HTML
    let html = body
        // Code blocks
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
            `<pre class="md-code-block"><code class="lang-${lang || 'text'}">${escHtml(code.trim())}</code></pre>`)
        // Headings
        .replace(/^#{6} (.+)$/gm, '<h6 class="md-h6">$1</h6>')
        .replace(/^#{5} (.+)$/gm, '<h5 class="md-h5">$1</h5>')
        .replace(/^#{4} (.+)$/gm, '<h4 class="md-h4">$1</h4>')
        .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
        // Bold & italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr class="md-hr">')
        // Unordered lists
        .replace(/^- (.+)$/gm, '<li class="md-li">$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li class="md-li md-oli">$1</li>')
        // Blockquotes
        .replace(/^> (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>')
        // Paragraphs (blank line separated)
        .split(/\n\n+/)
        .map(block => {
            block = block.trim();
            if (!block) return '';
            // Don't wrap elements that are already block HTML
            if (/^<(h[1-6]|pre|blockquote|hr|ul|ol|li)/.test(block)) return block;
            // Wrap list items in ul
            if (block.includes('<li class="md-li md-oli">')) {
                return '<ol class="md-ol">' + block + '</ol>';
            }
            if (block.includes('<li class="md-li">')) {
                return '<ul class="md-ul">' + block + '</ul>';
            }
            return `<p class="md-p">${block.replace(/\n/g, '<br>')}</p>`;
        })
        .join('\n');

    return { frontmatter, html };
}

function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── GITHUB CONTENT FETCHER ──────────────────────────────────────────────────
class ContentFetcher {
    constructor() {
        this._cache = new Map();
    }

    /** Recursively walk the GitHub API and return all .md file paths */
    async _listFiles(dirPath) {
        const url = `${API_BASE}/${dirPath}`;
        const res = await fetch(url, { headers: { Accept: 'application/vnd.github.v3+json' } });
        if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`);
        const items = await res.json();
        const mdFiles = [];
        for (const item of items) {
            if (item.type === 'file' && item.name.endsWith('.md')) {
                mdFiles.push(item.path);
            } else if (item.type === 'dir') {
                const sub = await this._listFiles(item.path);
                mdFiles.push(...sub);
            }
        }
        return mdFiles;
    }

    /** Fetch a single raw markdown file */
    async _fetchRaw(path) {
        if (this._cache.has(path)) return this._cache.get(path);
        const url = `${RAW_BASE}/${path}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Raw fetch ${res.status}: ${url}`);
        const text = await res.text();
        this._cache.set(path, text);
        return text;
    }

    /**
     * Load all posts for a section and language.
     * @param {string} section - 'blog' | 'news' | 'updates'
     * @param {string} lang    - 'en' | 'ar'
     * @returns {Promise<Array>} parsed post objects
     */
    async loadSection(section, lang) {
        const dir = `content/${section}/${lang}`;
        let paths;
        try {
            paths = await this._listFiles(dir);
        } catch (e) {
            // Fallback: if language folder doesn't exist, try 'en'
            if (lang !== 'en') {
                paths = await this._listFiles(`content/${section}/en`);
            } else {
                throw e;
            }
        }

        const posts = await Promise.allSettled(paths.map(async (path) => {
            const raw = await this._fetchRaw(path);
            const { frontmatter, html } = parseMarkdown(raw);

            // Extract date from path: content/blog/en/2026/05/10/slug.md
            const pathParts = path.split('/');
            const slugFile = pathParts[pathParts.length - 1];
            const slug = slugFile.replace(/\.md$/, '');
            // Try to get yyyy/mm/dd from path
            let dateStr = frontmatter.date || '';
            if (!dateStr && pathParts.length >= 7) {
                dateStr = `${pathParts[3]}-${pathParts[4]}-${pathParts[5]}`;
            }

            return {
                id: `${section}-${lang}-${slug}`,
                slug,
                section,
                lang,
                path,
                type: frontmatter.category || frontmatter.type || section,
                title: frontmatter.title || slug,
                date: dateStr,
                author: frontmatter.author || 'N(DATA) Team',
                version: frontmatter.version || null,
                tags: frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : [],
                excerpt: html.replace(/<[^>]+>/g, '').slice(0, 180).trim() + '…',
                html,
            };
        }));

        return posts
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
    }
}

// ─── UPDATES APP ─────────────────────────────────────────────────────────────
class UpdatesApp {
    constructor() {
        this.fetcher = new ContentFetcher();
        this.allPosts = [];
        this.filteredPosts = [];
        this.currentType = 'all';
        this.currentSearchQuery = '';
        this.currentItem = null;
        this.lang = localStorage.getItem('lang') || 'en';

        this.grid = document.getElementById('grid-container');
        this.loader = document.getElementById('loader');
        this.searchInput = document.getElementById('search-input');
        this.itemCount = document.getElementById('item-count');
        this.modal = document.getElementById('modal');
        this.modalPanel = document.getElementById('modal-panel');
        this.noResults = document.getElementById('no-results');
        this.errorMessage = document.getElementById('error-message');

        this.bindEvents();
        this.initStickyFilters();
    }

    async start() {
        this.showLoader(true);
        try {
            // Load all three sections in parallel
            const [blogs, news, updates] = await Promise.allSettled([
                this.fetcher.loadSection('blog', this.lang),
                this.fetcher.loadSection('news', this.lang),
                this.fetcher.loadSection('updates', this.lang),
            ]);

            this.allPosts = [
                ...(blogs.status === 'fulfilled' ? blogs.value : []),
                ...(news.status === 'fulfilled' ? news.value : []),
                ...(updates.status === 'fulfilled' ? updates.value : []),
            ];

            // Sort newest first
            this.allPosts.sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);

            this.showLoader(false);
            this.applyFiltersAndRender();

            if (typeof lucide !== 'undefined') lucide.createIcons();

            // Check URL hash for direct post link
            this.checkUrlForPost();

        } catch (e) {
            this.showLoader(false);
            this.showError(e.message || 'Failed to load content from GitHub.');
            console.error('UpdatesApp error:', e);
        }
    }

    applyFiltersAndRender() {
        let results = this.allPosts;

        if (this.currentType !== 'all') {
            results = results.filter(p => p.type === this.currentType || p.section === this.currentType);
        }

        if (this.currentSearchQuery.trim()) {
            const q = this.currentSearchQuery.toLowerCase();
            results = results.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.excerpt.toLowerCase().includes(q) ||
                p.author.toLowerCase().includes(q) ||
                p.tags.some(t => t.toLowerCase().includes(q))
            );
        }

        this.filteredPosts = results;
        this.render(results);
    }

    render(posts) {
        if (!this.grid) return;

        if (this.itemCount) this.itemCount.textContent = posts.length;

        if (posts.length === 0) {
            this.grid.classList.add('hidden');
            this.noResults?.classList.remove('hidden');
            return;
        }

        this.noResults?.classList.add('hidden');
        this.grid.classList.remove('hidden');

        this.grid.innerHTML = posts.map(post => this.buildCard(post)).join('');

        // Bind card click events
        this.grid.querySelectorAll('[data-post-id]').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.postId;
                const post = this.allPosts.find(p => p.id === id);
                if (post) this.openModal(post);
            });
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    buildCard(post) {
        const typeLabel = post.type.toUpperCase();
        const dateDisplay = post.date ? new Date(post.date + 'T00:00:00').toLocaleDateString(this.lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        const versionBadge = post.version ? `<span class="text-xs font-mono opacity-60 ml-2">v${post.version}</span>` : '';

        return `
<article class="data-card p-6 flex flex-col h-full cursor-pointer" data-post-id="${escHtml(post.id)}">
    <div class="flex items-center justify-between mb-4">
        <span class="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-2 py-1 uppercase tracking-wider">${escHtml(typeLabel)}</span>
        ${versionBadge}
    </div>
    <h3 class="text-lg sm:text-xl font-black mb-2 brand-font line-clamp-2">${escHtml(post.title)}</h3>
    <p class="text-xs sm:text-sm opacity-60 mb-4 flex-grow line-clamp-3">${escHtml(post.excerpt)}</p>
    <div class="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs font-mono opacity-50">
        <span>${escHtml(dateDisplay)}</span>
        <span>${escHtml(post.author)}</span>
    </div>
</article>`;
    }

    openModal(post) {
        this.currentItem = post;
        const modalType = document.getElementById('modal-type');
        const modalTitle = document.getElementById('modal-title');
        const modalDate = document.getElementById('modal-date');
        const modalAuthor = document.getElementById('modal-author');
        const modalTags = document.getElementById('modal-tags');
        const modalContent = document.getElementById('modal-content');

        if (modalType) modalType.textContent = post.type.toUpperCase();
        if (modalTitle) modalTitle.textContent = post.title;
        if (modalDate) {
            const d = post.date ? new Date(post.date + 'T00:00:00').toLocaleDateString(this.lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
            modalDate.textContent = d;
        }
        if (modalAuthor) modalAuthor.textContent = post.author;

        if (modalTags) {
            modalTags.innerHTML = post.tags.length > 0
                ? post.tags.map(t => `<span class="text-xs font-mono px-2 py-1 border border-gray-300 dark:border-gray-600">${escHtml(t)}</span>`).join('')
                : '';
        }

        if (modalContent) {
            modalContent.innerHTML = post.html;
        }

        // Update URL
        const url = new URL(window.location.href);
        url.hash = post.id;
        history.pushState({ postId: post.id }, '', url.toString());

        // Show modal
        this.modal.classList.remove('hidden');
        setTimeout(() => this.modalPanel.classList.remove('translate-x-full'), 10);
        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    closeModal() {
        this.modalPanel.classList.add('translate-x-full');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
        this.currentItem = null;
        const url = new URL(window.location.href);
        url.hash = '';
        history.pushState({}, '', url.toString().replace(/#$/, ''));
    }

    sharePost() {
        if (!this.currentItem) return;
        const data = { title: this.currentItem.title, url: window.location.href };
        if (navigator.share) {
            navigator.share(data).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                this._toast('Link copied!');
            });
        }
    }

    copyLink() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            this._toast('Link copied!');
        });
    }

    _toast(msg) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-mono px-4 py-2 rounded z-[300] opacity-0 transition-opacity duration-200';
        document.body.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = '1'; });
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2200);
    }

    checkUrlForPost() {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            const post = this.allPosts.find(p => p.id === hash);
            if (post) this.openModal(post);
        }
    }

    showLoader(show) {
        if (show) {
            this.loader?.classList.remove('hidden');
            this.grid?.classList.add('hidden');
            this.noResults?.classList.add('hidden');
            this.errorMessage?.classList.add('hidden');
        } else {
            this.loader?.classList.add('hidden');
        }
    }

    showError(msg) {
        this.errorMessage?.classList.remove('hidden');
        const errText = document.getElementById('error-text');
        if (errText) errText.textContent = msg;
        this.grid?.classList.add('hidden');
        this.noResults?.classList.add('hidden');
    }

    initStickyFilters() {
        const filtersSection = document.getElementById('filters-section');
        if (!filtersSection) return;

        const nav = document.querySelector('nav');
        const navH = nav ? nav.offsetHeight : 80;

        const observer = new IntersectionObserver(
            ([e]) => filtersSection.classList.toggle('is-sticky', e.intersectionRatio < 1),
            { threshold: [1], rootMargin: `-${navH}px 0px 0px 0px` }
        );
        observer.observe(filtersSection);
    }

    bindEvents() {
        // Category filter
        document.querySelectorAll('#category-filters button[data-cat]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#category-filters button[data-cat]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentType = btn.dataset.cat;
                this.applyFiltersAndRender();
            });
        });

        // Search
        let searchTimeout;
        this.searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentSearchQuery = e.target.value;
                this.applyFiltersAndRender();
            }, 280);
        });

        // Keyboard: Escape closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal?.classList.contains('hidden')) {
                this.closeModal();
            }
        });

        // Browser back
        window.addEventListener('popstate', () => {
            const hash = window.location.hash.replace('#', '');
            if (!hash) {
                if (!this.modal?.classList.contains('hidden')) this.closeModal();
            }
        });
    }

    /** Called by layout.js when language changes */
    onLangChange(newLang) {
        this.lang = newLang;
        this.applyTranslations();
        // Re-render with new locale date formatting
        if (this.allPosts.length > 0) this.applyFiltersAndRender();
    }

    applyTranslations() {
        if (!window.NLayout) return;
        const strings = window._updatesStrings || {};
        const t = (path, fb) => {
            const keys = path.split('.');
            let v = strings;
            for (const k of keys) { if (v && typeof v === 'object') v = v[k]; else return fb || path; }
            return v || fb || path;
        };

        const el = (id) => document.getElementById(id);

        if (el('posts-label')) el('posts-label').textContent = t('updates_page.posts_label', 'POSTS');
        if (el('filter-all')) el('filter-all').textContent = t('updates_page.filter_all', 'ALL');
        if (el('filter-news')) el('filter-news').textContent = t('updates_page.filter_news', 'NEWS');
        if (el('filter-updates')) el('filter-updates').textContent = t('updates_page.filter_updates', 'UPDATES');
        if (el('filter-blogs')) el('filter-blogs').textContent = t('updates_page.filter_blogs', 'BLOGS');
        if (this.searchInput) this.searchInput.placeholder = t('updates_page.search_placeholder', 'SEARCH UPDATES...');
        if (el('no-results-title')) el('no-results-title').textContent = t('updates_page.no_results_title', 'NO RESULTS');
        if (el('no-results-desc')) el('no-results-desc').textContent = t('updates_page.no_results_desc', 'Try adjusting your filters or search query');
        if (el('btn-share')) el('btn-share').textContent = t('updates_page.share', 'SHARE');
        if (el('btn-copy-link')) el('btn-copy-link').textContent = t('updates_page.copy_link', 'COPY LINK');
    }
}

// Helper
function escHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

// ─── BOOT ────────────────────────────────────────────────────────────────────
const updatesApp = new UpdatesApp();
window.updatesApp = updatesApp;

// Hook into layout.js
window.__layoutOnLangChange = function(newLang, strings) {
    window._updatesStrings = strings;
    updatesApp.onLangChange(newLang);
    if (window.NLayout) window.NLayout.applyLayoutTranslations(strings, newLang);
};

document.addEventListener('layout:ready', (e) => {
    window._updatesStrings = e.detail.strings;
    updatesApp.lang = e.detail.lang || 'en';
    updatesApp.applyTranslations();
    updatesApp.start();
});
