/**
 * layout.js — Shared Navbar & Footer Injector
 * Renders the same nav and footer on every page.
 * Pages just need: <div id="site-nav"></div> and <div id="site-footer"></div>
 * Plus: <script src="/static/js/layout.js"></script>
 *
 * The script auto-detects which page is active by matching window.location.pathname
 * and underlines the correct nav link.
 */

(function () {
    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Return the active class string if path matches current page */
    function activeIf(href) {
        const p = window.location.pathname;
        // Normalise: strip trailing slash
        const norm = (s) => s.replace(/\/$/, '') || '/';
        const match =
            norm(p) === norm(href) ||
            (href !== '/' && p.startsWith(href));
        return match
            ? 'underline decoration-red-600 decoration-2 underline-offset-4 hover:text-red-600 transition-colors brand-font text-sm'
            : 'hover:text-red-600 transition-colors brand-font text-sm';
    }

    // ── Nav HTML ───────────────────────────────────────────────────────────────
    function buildNav() {
        return `
<nav class="sticky top-0 z-50 glass-panel px-4 sm:px-6 py-4 flex justify-between items-center">
    <div class="flex items-center gap-2 sm:gap-3 group cursor-pointer" onclick="if(window.app&&app.reset)app.reset();else window.location='/'">
        <div class="w-6 h-6 sm:w-8 sm:h-8 bg-red-600 rounded-full group-hover:scale-110 transition-transform"></div>
        <span class="text-xl sm:text-2xl brand-font font-bold tracking-tighter"><a href="/">N(DATA)</a></span>
    </div>

    <div class="hidden md:flex items-center gap-6">
        <a href="/" data-nav="home" class="${activeIf('/')}">HOME</a>
        <a href="/pages/about" data-nav="about" class="${activeIf('/pages/about')}">ABOUT</a>
        <a href="/pages/updates" data-nav="updates" class="${activeIf('/pages/updates')}">UPDATES</a>
        <a href="/api/docs" data-nav="docs" class="${activeIf('/api/docs')}">DOCS</a>
        <a href="/api/api" data-nav="api" class="${activeIf('/api/api')}">API</a>

        <!-- Bookmarks (index only) -->
        <button id="bookmarks-btn" class="relative p-2 hover:bg-gray-300 dark:hover:bg-gray-800 rounded-full transition" title="Bookmarks" style="display:none">
            <i data-lucide="bookmark" class="w-5 h-5"></i>
            <span id="bookmarks-badge" class="nav-badge hidden">0</span>
        </button>

        <!-- Compare (index only) -->
        <button id="compare-btn" class="relative p-2 hover:bg-gray-300 dark:hover:bg-gray-800 rounded-full transition" title="Compare" style="display:none">
            <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
            <span id="compare-badge" class="nav-badge hidden">0</span>
        </button>

        <!-- Currency -->
        <div class="relative currency-selector">
            <button id="currency-toggle" class="p-2 hover:bg-gray-300 dark:hover:bg-gray-800 rounded-full transition flex items-center gap-1">
                <span id="currency-symbol" class="text-sm font-mono">$</span>
            </button>
            <div id="currency-dropdown" class="hidden absolute right-0 mt-2 text-red-500 bg-gray-300 dark:bg-zinc-900 border border-gray-300 dark:border-gray-700 rounded shadow-lg min-w-[120px] z-50">
                <button data-currency="USD" class="w-full px-4 py-2 text-left hover:text-red-500 hover:bg-black dark:hover:bg-black transition flex items-center gap-2 text-sm font-mono"><span>$</span><span>USD</span></button>
                <button data-currency="SAR" class="w-full px-4 py-2 text-left hover:text-red-500 hover:bg-black dark:hover:bg-black transition flex items-center gap-2 text-sm font-mono"><i class="sr"></i><span>SAR</span></button>
                <button data-currency="EUR" class="w-full px-4 py-2 text-left hover:text-red-500 hover:bg-black dark:hover:bg-black transition flex items-center gap-2 text-sm font-mono"><span>&#8364;</span><span>EUR</span></button>
                <button data-currency="GBP" class="w-full px-4 py-2 text-left hover:text-red-500 hover:bg-black dark:hover:bg-black transition flex items-center gap-2 text-sm font-mono"><span>&#163;</span><span>GBP</span></button>
                <button data-currency="JPY" class="w-full px-4 py-2 text-left hover:text-red-500 hover:bg-black dark:hover:bg-black transition flex items-center gap-2 text-sm font-mono"><span>&#165;</span><span>JPY</span></button>
            </div>
        </div>

        <!-- Language -->
        <div class="relative">
            <button id="lang-toggle" class="p-2 hover:bg-gray-300 dark:hover:bg-gray-800 rounded-full transition flex items-center gap-1">
                <i data-lucide="globe" class="w-4 h-4"></i>
                <span id="lang-label" class="text-xs font-mono">EN</span>
            </button>
            <div id="lang-dropdown" class="hidden absolute right-0 mt-2 bg-gray-300 dark:bg-zinc-900 border border-gray-300 dark:border-gray-700 rounded shadow-lg min-w-[100px] z-50">
                <button data-lang="en" class="w-full px-4 py-2 text-left hover:text-red-500 hover:bg-black dark:hover:bg-black transition text-sm font-mono">English (EN)</button>
                <button data-lang="ar" class="w-full px-4 py-2 text-left hover:text-red-500 hover:bg-black dark:hover:bg-black transition text-sm font-mono">العربية (AR)</button>
            </div>
        </div>

        <!-- Theme -->
        <button id="theme-toggle" class="p-2 hover:bg-gray-300 dark:hover:bg-gray-800 rounded-full transition">
            <i data-lucide="moon" data-theme-icon class="w-5 h-5"></i>
        </button>
    </div>

    <button class="md:hidden p-2" id="mobile-menu-btn">
        <i data-lucide="menu" class="w-6 h-6"></i>
    </button>
</nav>

<!-- MOBILE MENU -->
<div id="mobile-menu" class="fixed inset-0 z-[60] hidden md:hidden">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" id="mobile-menu-backdrop"></div>
    <div class="absolute right-0 top-0 h-full w-72 glass-panel transform transition-transform duration-300 translate-x-full" id="mobile-menu-panel">
        <div class="p-6 flex flex-col gap-4 overflow-y-auto h-full">
            <button id="mobile-menu-close" class="self-end">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
            <a href="/" data-nav="home" class="${activeIf('/')}">HOME</a>
            <a href="/pages/about" data-nav="about" class="${activeIf('/pages/about')}">ABOUT</a>
            <a href="/pages/updates" data-nav="updates" class="${activeIf('/pages/updates')}">UPDATES</a>
            <a href="/api/docs" data-nav="docs" class="${activeIf('/api/docs')}">DOCS</a>
            <a href="/api/api" data-nav="api" class="${activeIf('/api/api')}">API</a>

            <!-- Mobile Bookmarks/Compare (index only) -->
            <div id="mobile-index-btns" class="border-t border-gray-300 dark:border-gray-700 pt-4 flex gap-3" style="display:none!important">
                <button id="mobile-bookmarks-btn" class="relative flex items-center gap-2 hover:text-red-600 transition-colors brand-font text-sm">
                    <i data-lucide="bookmark" class="w-4 h-4"></i> <span data-nav="bookmarks">SAVED</span>
                </button>
                <button id="mobile-compare-btn" class="relative flex items-center gap-2 hover:text-red-600 transition-colors brand-font text-sm">
                    <i data-lucide="bar-chart-2" class="w-4 h-4"></i> <span data-nav="compare">COMPARE</span>
                </button>
            </div>

            <!-- Mobile Currency -->
            <div class="border-t border-gray-300 dark:border-gray-700 pt-4">
                <span class="text-xs opacity-50 font-mono mb-2 block">CURRENCY</span>
                <div class="flex flex-wrap gap-2">
                    <button data-currency="USD" class="mobile-currency-btn hover:text-red-500 transition-colors brand-font text-xs px-2 py-1 border border-current">$ USD</button>
                    <button data-currency="SAR" class="mobile-currency-btn hover:text-red-500 transition-colors brand-font text-xs px-2 py-1 border border-current">SAR</button>
                    <button data-currency="EUR" class="mobile-currency-btn hover:text-red-500 transition-colors brand-font text-xs px-2 py-1 border border-current">&#8364; EUR</button>
                    <button data-currency="GBP" class="mobile-currency-btn hover:text-red-500 transition-colors brand-font text-xs px-2 py-1 border border-current">&#163; GBP</button>
                    <button data-currency="JPY" class="mobile-currency-btn hover:text-red-500 transition-colors brand-font text-xs px-2 py-1 border border-current">&#165; JPY</button>
                </div>
            </div>

            <!-- Mobile Language -->
            <div class="border-t border-gray-300 dark:border-gray-700 pt-4">
                <button id="mobile-lang-toggle" class="text-xs opacity-50 font-mono mb-2 flex items-center gap-2 w-full">
                    <i data-lucide="globe" class="w-3 h-3"></i>
                    LANGUAGE: <span id="mobile-lang-label" class="text-red-600">EN</span>
                </button>
                <div id="mobile-lang-dropdown" class="hidden flex flex-col gap-1">
                    <button data-lang="en" class="text-left hover:text-red-500 transition-colors brand-font text-sm px-2 py-1">English (EN)</button>
                    <button data-lang="ar" class="text-left hover:text-red-500 transition-colors brand-font text-sm px-2 py-1">العربية (AR)</button>
                </div>
            </div>

            <button id="mobile-theme-toggle" class="flex items-center gap-2 hover:text-red-600 transition-colors brand-font text-sm border-t border-gray-300 dark:border-gray-700 pt-4">
                <i data-lucide="moon" data-theme-icon class="w-5 h-5"></i>
                <span data-nav="toggle_theme">TOGGLE THEME</span>
            </button>
        </div>
    </div>
</div>`;
    }

    // ── Footer HTML ────────────────────────────────────────────────────────────
    function buildFooter() {
        return `
<footer class="border-t border-gray-300 dark:border-gray-800 px-4 sm:px-6 py-8 sm:py-12 mt-auto">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
            <h2 class="text-xl sm:text-2xl mb-4">N(DATA)</h2>
            <p class="text-xs sm:text-sm opacity-50 max-w-xs" id="footer-desc">
                Open source tech specification database.<br>
                Designed for transparency. Built for speed.<br>
                Website design inspired by <a href="https://nothing.tech/" target="_blank" class="links">Nothing <i class="fa fa-external-link" aria-hidden="true"></i></a>.
            </p>
            <p style="font-size:11px;opacity:0.3;font-weight:300;font-family:monospace;">
                Version <span id="app-version">0.0.0</span>
            </p>
        </div>
        <div class="flex gap-6 sm:gap-8 text-xs sm:text-sm font-mono">
            <div class="flex flex-col gap-2">
                <span class="opacity-40 mb-2 footer-project">PROJECT</span>
                <a href="https://github.com/Abdulaziz-hu/NData" target="_blank" class="hover:underline footer-github">GitHub</a>
                <a href="/pages/updates" class="hover:underline footer-updates">Updates</a>
                <a href="/api/docs" class="hover:underline footer-api-docs">API Docs</a>
                <a href="https://github.com/Abdulaziz-hu/NData?tab=readme-ov-file#-contributing" target="_blank" class="hover:underline footer-contribute">Contribute</a>
            </div>
            <div class="flex flex-col gap-2">
                <span class="opacity-40 mb-2 footer-legal">LEGAL</span>
                <a href="/pages/privacy" class="hover:underline footer-privacy">Privacy</a>
                <a href="/pages/terms-of-service" class="hover:underline footer-terms">Terms of Service</a>
                <a href="/pages/mit-license" class="hover:underline footer-license">MIT License</a>
            </div>
            <div class="flex flex-col gap-2">
                <span class="opacity-40 mb-2 footer-other">OTHER</span>
                <a href="/pages/report-forum" class="hover:underline footer-report">Report</a>
                <a href="/pages/disclaimers" class="hover:underline footer-disclaimers">Disclaimers</a>
                <button id="footer-credits-btn" class="hover:underline text-left hover:text-red-600 transition-colors footer-credits">Credits</button>
            </div>
        </div>
    </div>
</footer>`;
    }

    // ── Language Support ───────────────────────────────────────────────────────
    const RTL_LANGS = ['ar'];

    function getLang() {
        return localStorage.getItem('lang') || 'en';
    }

    function setLang(lang) {
        localStorage.setItem('lang', lang);
    }

    async function loadLangStrings(lang) {
        try {
            const r = await fetch(`/lang/${lang}.json`);
            if (!r.ok) throw new Error('missing');
            return await r.json();
        } catch {
            const r = await fetch('/lang/en.json');
            return r.ok ? await r.json() : {};
        }
    }

    function t(strings, path, fallback) {
        const keys = path.split('.');
        let v = strings;
        for (const k of keys) {
            if (v && typeof v === 'object') v = v[k];
            else return fallback || path;
        }
        return v || fallback || path;
    }

    function applyLayoutTranslations(strings, lang) {
        const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        document.documentElement.dir = dir;

        // Nav links
        const navMap = {
            '[data-nav="home"]': t(strings, 'nav.home', 'HOME'),
            '[data-nav="about"]': t(strings, 'nav.about', 'ABOUT'),
            '[data-nav="updates"]': t(strings, 'nav.updates', 'UPDATES'),
            '[data-nav="docs"]': t(strings, 'nav.docs', 'DOCS'),
            '[data-nav="api"]': t(strings, 'nav.api', 'API'),
            '[data-nav="toggle_theme"]': t(strings, 'nav.toggle_theme', 'TOGGLE THEME'),
        };
        for (const [sel, text] of Object.entries(navMap)) {
            document.querySelectorAll(sel).forEach(el => { el.textContent = text; });
        }

        // Footer
        const footerMap = {
            '#footer-desc': null, // handled separately (has HTML)
            '.footer-project': t(strings, 'footer.project', 'PROJECT'),
            '.footer-github': t(strings, 'footer.github', 'GitHub'),
            '.footer-updates': t(strings, 'footer.updates', 'Updates'),
            '.footer-api-docs': t(strings, 'footer.api_docs', 'API Docs'),
            '.footer-contribute': t(strings, 'footer.contribute', 'Contribute'),
            '.footer-legal': t(strings, 'footer.legal', 'LEGAL'),
            '.footer-privacy': t(strings, 'footer.privacy', 'Privacy'),
            '.footer-terms': t(strings, 'footer.terms', 'Terms of Service'),
            '.footer-license': t(strings, 'footer.license', 'MIT License'),
            '.footer-other': t(strings, 'footer.other', 'OTHER'),
            '.footer-report': t(strings, 'footer.report', 'Report'),
            '.footer-disclaimers': t(strings, 'footer.disclaimers', 'Disclaimers'),
            '.footer-credits': t(strings, 'footer.credits', 'Credits'),
        };
        for (const [sel, text] of Object.entries(footerMap)) {
            if (text === null) continue;
            document.querySelectorAll(sel).forEach(el => { el.textContent = text; });
        }

        // Footer description (keep the Nothing link intact)
        const footerDesc = document.getElementById('footer-desc');
        if (footerDesc) {
            const desc = t(strings, 'footer.description', 'Open source tech specification database. Designed for transparency. Built for speed.');
            const inspired = t(strings, 'footer.inspired_by', 'Website design inspired by');
            footerDesc.innerHTML = `${desc}<br>${inspired} <a href="https://nothing.tech/" target="_blank" class="links">Nothing <i class="fa fa-external-link" aria-hidden="true"></i></a>.`;
        }

        // Lang label
        document.querySelectorAll('#lang-label, #mobile-lang-label').forEach(el => {
            el.textContent = lang.toUpperCase();
        });
    }

    // ── Currency Support ───────────────────────────────────────────────────────
    function getCurrency() {
        return localStorage.getItem('currency') || 'USD';
    }

    function setCurrency(currency) {
        localStorage.setItem('currency', currency);
    }

    const CURRENCY_SYMBOLS_MAP = { USD: '$', SAR: '﷼', JPY: '¥', EUR: '€', GBP: '£' };

    function updateCurrencyDisplay(currency) {
        const sym = CURRENCY_SYMBOLS_MAP[currency] || '$';
        document.querySelectorAll('#currency-symbol').forEach(el => { el.textContent = sym; });
    }

    // ── Theme ──────────────────────────────────────────────────────────────────
    function initTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = saved === 'dark' || (!saved && prefersDark);
        if (isDark) document.body.classList.add('dark-mode');
        document.documentElement.classList.remove('dark-mode-pre');
        const icon = isDark ? 'sun' : 'moon';
        document.querySelectorAll('[data-theme-icon]').forEach(el => el.setAttribute('data-lucide', icon));
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const icon = isDark ? 'sun' : 'moon';
        document.querySelectorAll('[data-theme-icon]').forEach(el => el.setAttribute('data-lucide', icon));
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ── Mobile Menu ────────────────────────────────────────────────────────────
    function initMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        const panel = document.getElementById('mobile-menu-panel');
        const close = document.getElementById('mobile-menu-close');
        const backdrop = document.getElementById('mobile-menu-backdrop');
        if (!btn || !menu || !panel) return;

        btn.addEventListener('click', () => {
            menu.classList.remove('hidden');
            setTimeout(() => panel.classList.remove('translate-x-full'), 10);
            document.body.style.overflow = 'hidden';
        });

        const closeMenu = () => {
            panel.classList.add('translate-x-full');
            setTimeout(() => { menu.classList.add('hidden'); document.body.style.overflow = ''; }, 300);
        };

        close && close.addEventListener('click', closeMenu);
        backdrop && backdrop.addEventListener('click', closeMenu);
    }

    // ── Dropdowns ──────────────────────────────────────────────────────────────
    function initDropdowns(onLangChange, onCurrencyChange) {
        // Currency dropdown
        const currencyToggle = document.getElementById('currency-toggle');
        const currencyDropdown = document.getElementById('currency-dropdown');
        if (currencyToggle && currencyDropdown) {
            currencyToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                currencyDropdown.classList.toggle('hidden');
                document.getElementById('lang-dropdown')?.classList.add('hidden');
            });
        }

        // Lang dropdown
        const langToggle = document.getElementById('lang-toggle');
        const langDropdown = document.getElementById('lang-dropdown');
        if (langToggle && langDropdown) {
            langToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                langDropdown.classList.toggle('hidden');
                document.getElementById('currency-dropdown')?.classList.add('hidden');
            });
        }

        // Mobile lang dropdown
        const mobileLangToggle = document.getElementById('mobile-lang-toggle');
        const mobileLangDropdown = document.getElementById('mobile-lang-dropdown');
        if (mobileLangToggle && mobileLangDropdown) {
            mobileLangToggle.addEventListener('click', () => {
                mobileLangDropdown.classList.toggle('hidden');
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            document.getElementById('currency-dropdown')?.classList.add('hidden');
            document.getElementById('lang-dropdown')?.classList.add('hidden');
        });

        // Currency buttons
        document.querySelectorAll('[data-currency]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const currency = btn.dataset.currency;
                setCurrency(currency);
                updateCurrencyDisplay(currency);
                document.getElementById('currency-dropdown')?.classList.add('hidden');
                if (onCurrencyChange) onCurrencyChange(currency);
            });
        });

        // Lang buttons
        document.querySelectorAll('[data-lang]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const lang = btn.dataset.lang;
                setLang(lang);
                document.getElementById('lang-dropdown')?.classList.add('hidden');
                document.getElementById('mobile-lang-dropdown')?.classList.add('hidden');
                if (onLangChange) {
                    await onLangChange(lang);
                } else {
                    // Fallback: reload with new lang applied
                    const strings = await loadLangStrings(lang);
                    applyLayoutTranslations(strings, lang);
                }
            });
        });
    }

    // ── Bootstrap ──────────────────────────────────────────────────────────────
    async function init() {
        // Inject nav
        const navSlot = document.getElementById('site-nav');
        if (navSlot) navSlot.outerHTML = buildNav();

        // Inject footer
        const footerSlot = document.getElementById('site-footer');
        if (footerSlot) {
            footerSlot.outerHTML = buildFooter();
            // Stamp version immediately after footer DOM exists
            if (typeof window.currentVersion !== 'undefined') {
                document.querySelectorAll('#app-version').forEach(el => { el.textContent = window.currentVersion; });
            }
        }

        // Theme
        initTheme();

        // Mobile menu
        initMobileMenu();

        // Theme toggles
        document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
        document.getElementById('mobile-theme-toggle')?.addEventListener('click', toggleTheme);

        // Currency init
        const currency = getCurrency();
        updateCurrencyDisplay(currency);

        // Lang init
        const lang = getLang();
        const strings = await loadLangStrings(lang);
        applyLayoutTranslations(strings, lang);

        // Dropdowns
        const externalLangChange = window.__layoutOnLangChange || null;
        const externalCurrencyChange = window.__layoutOnCurrencyChange || null;
        initDropdowns(
            async (newLang) => {
                const s = await loadLangStrings(newLang);
                applyLayoutTranslations(s, newLang);
                if (externalLangChange) externalLangChange(newLang, s);
            },
            (newCurrency) => {
                if (externalCurrencyChange) externalCurrencyChange(newCurrency);
            }
        );

        // Footer credits button
        document.getElementById('footer-credits-btn')?.addEventListener('click', () => {
            if (window.app && typeof window.app.openCreditsModal === 'function') {
                window.app.openCreditsModal();
            }
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Signal ready
        document.dispatchEvent(new CustomEvent('layout:ready', { detail: { lang, strings } }));
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for external pages to hook into
    window.NLayout = {
        getLang,
        getCurrency,
        loadLangStrings,
        applyLayoutTranslations,
        updateCurrencyDisplay,
        toggleTheme,
    };
})();
