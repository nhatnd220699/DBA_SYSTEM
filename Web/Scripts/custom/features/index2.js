import { Popup, ActionLock, ApiClient, renderIcon } from '../modules/app.js';

// --- FULL INTERACTIVE NAVIGATION, SIDEBAR & USER MENU VANILLA JS ---
document.addEventListener('DOMContentLoaded', () => {
    //// Elements
    const userMenuWrapper = document.getElementById('userMenuWrapper');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const userMenuArrow = document.getElementById('userMenuArrow');

    const userProfileModal = document.getElementById('userProfileModal');
    const openProfileBtn = document.getElementById('openProfileBtn');
    const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
    const closeProfileModalSecondaryBtn = document.getElementById('closeProfileModalSecondaryBtn');

    const accountConfigModal = document.getElementById('accountConfigModal');
    const openConfigBtn = document.getElementById('openConfigBtn');
    const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
    const saveConfigBtn = document.getElementById('saveConfigBtn');

    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const openLogoutBtn = document.getElementById('openLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');

    // 3. USER DROPDOWN (CLICK + HOVER SUPPORT, OUTSIDE CLICK & ESCAPE)
    let userMenuHoverTimeout;

    function openUserMenu() {
        clearTimeout(userMenuHoverTimeout);
        userDropdownMenu.classList.remove('hidden');
        if (userMenuArrow) userMenuArrow.classList.add('rotate-180');
    }

    function closeUserMenu() {
        userDropdownMenu.classList.add('hidden');
        if (userMenuArrow) userMenuArrow.classList.remove('rotate-180');
    }

    function toggleUserMenu(e) {
        if (e) e.stopPropagation();
        if (userDropdownMenu.classList.contains('hidden')) {
            openUserMenu();
        } else {
            closeUserMenu();
        }
    }

    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserMenu);
    }

    if (userMenuWrapper) {
        userMenuWrapper.addEventListener('mouseenter', openUserMenu);
        userMenuWrapper.addEventListener('mouseleave', () => {
            userMenuHoverTimeout = setTimeout(closeUserMenu, 250);
        });
    }

    // 4. MODALS LOGIC (PROFILE, CONFIG, LOGOUT)
    if (openProfileBtn) {
        openProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeUserMenu();
            userProfileModal.classList.remove('hidden');
        });
    }
    if (closeProfileModalBtn)
        closeProfileModalBtn.addEventListener('click', () => userProfileModal.classList.add('hidden'));
    if (closeProfileModalSecondaryBtn)
        closeProfileModalSecondaryBtn.addEventListener('click', () =>
            userProfileModal.classList.add('hidden'),
        );

    if (openConfigBtn) {
        openConfigBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeUserMenu();
            accountConfigModal.classList.remove('hidden');
        });
    }
    if (closeConfigModalBtn)
        closeConfigModalBtn.addEventListener('click', () => accountConfigModal.classList.add('hidden'));
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', () => {
            alert('Đã cập nhật cấu hình tài khoản và thông số giám sát NOC!');
            accountConfigModal.classList.add('hidden');
        });
    }

    if (openLogoutBtn) {
        openLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeUserMenu();
            logoutConfirmModal.classList.remove('hidden');
        });
    }
    if (cancelLogoutBtn)
        cancelLogoutBtn.addEventListener('click', () => logoutConfirmModal.classList.add('hidden'));

    // 5. GLOBAL CLICK OUTSIDE & ESCAPE HANDLER
    document.addEventListener('click', (e) => {
        // Outside click closes dropdown
        if (userMenuWrapper && !userMenuWrapper.contains(e.target)) {
            closeUserMenu();
        }
        // Outside click closes modals if clicked on backdrop
        [
            userProfileModal,
            accountConfigModal,
            logoutConfirmModal,
            document.getElementById('deadlockModal'),
            document.getElementById('compareModal'),
        ].forEach((modal) => {
            if (modal && e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSidebar();
            closeUserMenu();
            if (userProfileModal) userProfileModal.classList.add('hidden');
            if (accountConfigModal) accountConfigModal.classList.add('hidden');
            if (logoutConfirmModal) logoutConfirmModal.classList.add('hidden');
            const deadlockModal = document.getElementById('deadlockModal');
            const compareModal = document.getElementById('compareModal');
            if (deadlockModal) deadlockModal.classList.add('hidden');
            if (compareModal) compareModal.classList.add('hidden');
        }
    });

    // Select initial leaf (Overview Fleet)
    const initialLeaf = document.querySelector('.nav-leaf[data-path="overview-dashboard"]');
    if (initialLeaf) {
        initialLeaf.click();
    }
});
