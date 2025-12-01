// ui.js - Handles DOM manipulation and View States

import { copyToClipboard, resizeParent } from './utils.js';

export const UI = {
    elements: {
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('.section'),
        loadingOverlay: document.querySelector('.loading-overlay'),
        notificationBanner: document.getElementById('notification-banner'),
        copyButtons: document.querySelectorAll('.copy-btn'),
        returnForm: document.getElementById('return-form'),
        searchNameInput: document.getElementById('search-name'),
        searchBtn: document.getElementById('search-btn'),
        packageList: document.getElementById('package-list'),
        packageSelectContainer: document.getElementById('package-select-container'),
        returnFormDetails: document.getElementById('return-form-details')
    },

    init() {
        this.bindEvents();
        this.setupTippy();
        // Force a resize on init
        setTimeout(resizeParent, 500);
    },

    bindEvents() {
        // Tab Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetId = e.target.dataset.target;
                this.switchTab(targetId);
            });
        });

        // Copy Buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetInputId = e.currentTarget.dataset.copyTarget;
                const input = document.getElementById(targetInputId);
                if (input) {
                    this.handleCopy(input.value);
                }
            });
        });

        // Input fields click to copy (optional, mimicking old behavior)
        document.querySelectorAll('.click-to-copy').forEach(input => {
             input.addEventListener('click', (e) => {
                 this.handleCopy(e.target.value);
             });
        });

        // Other bindings (Form submission etc.) are handled in app.js or specific methods
    },

    switchTab(tabId) {
        // Update Nav
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.toggle('active', nav.dataset.target === tabId);
        });

        // Update Sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            if (section.id === tabId) {
                section.classList.add('active');
            }
        });

        // Resize parent iframe after content change
        setTimeout(resizeParent, 100);
        setTimeout(resizeParent, 500); // Double check for async content
    },

    async handleCopy(text) {
        try {
            await copyToClipboard(text);
            Swal.fire({
                icon: 'success',
                title: '已複製',
                showConfirmButton: false,
                timer: 1000,
                toast: true,
                position: 'top-end'
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: '複製失敗',
                text: '請手動複製',
                timer: 1500
            });
        }
    },

    showLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.style.display = 'flex';
    },

    hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    setupTippy() {
        // If we have tooltips
        if (window.tippy) {
            tippy('[data-tippy-content]');
        }
    },

    // Helper to render package selection buttons
    renderPackageList(packages, onSelect) {
        const container = document.getElementById('package-list');
        container.innerHTML = '';

        if (packages.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">查無包裹資料</p>';
            return;
        }

        packages.forEach((pkg, index) => {
            // pkg.output structure from legacy:
            // [0]Time, [1]Name, [2]Way/Note, [3]Platform, [4]Product, [5]?, [6]Money, [7]Type, [8]Status(y/n)

            // Skip if status is 'y' (already processed)
            if (pkg.output[8] === 'y') return;

            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.marginBottom = '10px';
            btn.style.width = '100%';

            let label = pkg.output[4]; // Product
            if (pkg.output[2]) label += ` / ${pkg.output[2]}`; // Note

            btn.textContent = label;
            btn.onclick = () => onSelect(pkg.output);

            container.appendChild(btn);
        });

        document.getElementById('package-select-container').classList.remove('hidden');
    },

    resetReturnForm() {
        document.getElementById('return-form').reset();
        document.getElementById('return-form-details').classList.add('hidden');
        document.getElementById('package-select-container').classList.add('hidden');
        document.getElementById('search-result-area').classList.add('hidden');
    }
};
