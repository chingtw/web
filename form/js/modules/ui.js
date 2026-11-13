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
        
        // 防呆 1: 確保容器存在
        if (!container) {
            console.error("❌ 錯誤: HTML 中找不到 id='package-list' 的元素");
            return;
        }

        container.innerHTML = '';

        if (packages.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">查無包裹資料</p>';
            return;
        }

        packages.forEach((pkg, index) => {
            // pkg.output structure from legacy:
            // [0]Time, [1]Name, [2]Way/Note, [3]Platform, [4]Product, [5]?, [6]Money, [7]Type, [8]Status(y/n)

            // Skip if status is 'y' (already processed)
            if (pkg.output && pkg.output[8] === 'y') return;

            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.marginBottom = '10px';
            btn.style.width = '100%';

            // 安全讀取資料 (防止 undefined)
            let label = pkg.output[4] || "未命名商品"; // Product
            if (pkg.output[2]) label += ` / ${pkg.output[2]}`; // Note

            btn.textContent = label;
            btn.onclick = () => onSelect(pkg.output);

            container.appendChild(btn);
        });

        // --- 修正錯誤的關鍵點 ---
        // 優先尋找 search-result-area，如果找不到才找 package-select-container
        const resultArea = document.getElementById('search-result-area') || document.getElementById('package-select-container');
        
        if (resultArea) {
            resultArea.classList.remove('hidden');
        } else {
            console.warn("⚠️ 警告: 找不到 'search-result-area' 或 'package-select-container'，列表無法顯示");
        }
    },

    resetReturnForm() {
        const form = document.getElementById('return-form');
        if(form) form.reset();

        const details = document.getElementById('return-form-details');
        if(details) details.classList.add('hidden');

        // 同樣加上防呆
        const selectContainer = document.getElementById('package-select-container');
        if(selectContainer) selectContainer.classList.add('hidden');

        const resultArea = document.getElementById('search-result-area');
        if(resultArea) resultArea.classList.add('hidden');
    }
};
