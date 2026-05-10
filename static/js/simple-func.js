// Simple shared functions for non-index pages (no grid/data needed)
// Handles theme, mobile menu, and currency display for static pages.

(function () {
    // Theme init
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

    function initThemeToggles() {
        document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
        document.getElementById('mobile-theme-toggle')?.addEventListener('click', toggleTheme);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initMobileMenu();
        initThemeToggles();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // Make reset a no-op on non-index pages
    window.app = window.app || { reset: () => {} };
})();
