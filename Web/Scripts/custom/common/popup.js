//let popupElement;
//let messageElement;
//let spinnerElement;
//let hideTimer;

//function injectStyles() {
//    if (document.getElementById("popup-style")) {
//        return;
//    }

//    const style = document.createElement("style");

//    style.id = "popup-style";

//    style.textContent = `
//        .popup {
//            position: fixed;
//            top: 20px;
//            left: 50%;
//            transform: translateX(-50%) scale(.95);
//            background: #333;
//            color: #fff;
//            padding: 12px 20px;
//            border-radius: 10px;
//            display: flex;
//            align-items: center;
//            gap: 10px;
//            z-index: 99999;
//            opacity: 0;
//            pointer-events: none;
//            transition: all .3s ease;
//        }

//        .popup.show {
//            opacity: 1;
//            transform: translateX(-50%) scale(1);
//        }

//        .popup.success {
//            background: #2e7d32;
//        }

//        .popup.error {
//            background: #c62828;
//        }

//        .popup.warning {
//            background: #ed6c02;
//        }

//        .popup-spinner {
//            width: 16px;
//            height: 16px;
//            border: 3px solid #ccc;
//            border-top-color: #fff;
//            border-radius: 50%;
//            animation: popup-spin 1s linear infinite;
//        }

//        @keyframes popup-spin {
//            to {
//                transform: rotate(360deg);
//            }
//        }
//    `;

//    document.head.appendChild(style);
//}

//function initialize() {

//    if (popupElement) {
//        return;
//    }

//    injectStyles();

//    popupElement = document.createElement("div");

//    popupElement.id = "global-popup";
//    popupElement.className = "popup";

//    popupElement.innerHTML = `
//        <div class="popup-spinner"></div>
//        <span></span>
//    `;

//    document.body.appendChild(popupElement);

//    spinnerElement =
//        popupElement.querySelector(".popup-spinner");

//    messageElement =
//        popupElement.querySelector("span");
//}

//function ensureReady() {

//    if (!popupElement) {
//        initialize();
//    }
//}

//function display({
//    message,
//    type = "",
//    loading = false,
//    autoHide = false,
//    delay = 3000
//}) {

//    ensureReady();

//    clearTimeout(hideTimer);

//    popupElement.className =
//        `popup show ${type}`.trim();

//    spinnerElement.style.display =
//        loading
//            ? "block"
//            : "none";

//    messageElement.textContent =
//        message;

//    if (autoHide) {

//        hideTimer =
//            setTimeout(
//                () => Popup.hide(),
//                delay
//            );
//    }
//}

//export const Popup = {

//    show(message) {

//        display({
//            message,
//            loading: true
//        });
//    },

//    success(message, delay = 3000) {

//        display({
//            message,
//            type: "success",
//            autoHide: true,
//            delay
//        });
//    },

//    error(message, delay = 4000) {

//        display({
//            message,
//            type: "error",
//            autoHide: true,
//            delay
//        });
//    },

//    warning(message, delay = 4000) {

//        display({
//            message,
//            type: "warning",
//            autoHide: true,
//            delay
//        });
//    },

//    hide() {

//        if (!popupElement) {
//            return;
//        }

//        popupElement.classList.remove(
//            "show"
//        );
//    }
//};

//if (document.readyState === "loading") {

//    document.addEventListener(
//        "DOMContentLoaded",
//        initialize
//    );

//} else {

//    initialize();
//}

let popupElement;
let iconElement;
let messageElement;
let spinnerElement;
let closeButtonElement;
let progressElement;
let hideTimer;
let progressTimer;

const VALID_POSITIONS = new Set([
    "top-left",
    "top-center",
    "top-right",
    "center-left",
    "center",
    "center-right",
    "bottom-left",
    "bottom-center",
    "bottom-right"
]);

const POPUP_ICONS = {
    success: "✓",
    error: "!",
    warning: "!",
    info: "i"
};

function injectStyles() {
    if (document.getElementById("popup-style")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "popup-style";

    style.textContent = `
        :root {
            --popup-offset: 24px;
            --popup-z-index: 99999;
        }

        .popup {
            position: fixed;
            z-index: var(--popup-z-index);

            width: max-content;
            max-width: min(420px, calc(100vw - 32px));
            min-width: 280px;

            display: flex;
            align-items: center;
            gap: 12px;

            padding: 13px 14px;
            overflow: hidden;

            color: #334155;
            background: rgba(255, 255, 255, 0.96);

            border: 1px solid rgba(148, 163, 184, 0.28);
            border-radius: 14px;

            box-shadow:
                0 18px 45px rgba(15, 23, 42, 0.14),
                0 4px 12px rgba(15, 23, 42, 0.08);

            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);

            opacity: 0;
            visibility: hidden;
            pointer-events: none;

            transition:
                opacity 220ms ease,
                transform 220ms ease,
                visibility 220ms ease;
        }

        .popup.show {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }

        /* ---------- Positions ---------- */

        .popup.top-left {
            top: var(--popup-offset);
            left: var(--popup-offset);
            transform: translateY(-14px) scale(0.97);
        }

        .popup.top-left.show {
            transform: translateY(0) scale(1);
        }

        .popup.top-center {
            top: var(--popup-offset);
            left: 50%;
            transform: translate(-50%, -14px) scale(0.97);
        }

        .popup.top-center.show {
            transform: translate(-50%, 0) scale(1);
        }

        .popup.top-right {
            top: var(--popup-offset);
            right: var(--popup-offset);
            transform: translateY(-14px) scale(0.97);
        }

        .popup.top-right.show {
            transform: translateY(0) scale(1);
        }

        .popup.center-left {
            top: 50%;
            left: var(--popup-offset);
            transform: translate(-14px, -50%) scale(0.97);
        }

        .popup.center-left.show {
            transform: translate(0, -50%) scale(1);
        }

        .popup.center {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.94);
        }

        .popup.center.show {
            transform: translate(-50%, -50%) scale(1);
        }

        .popup.center-right {
            top: 50%;
            right: var(--popup-offset);
            transform: translate(14px, -50%) scale(0.97);
        }

        .popup.center-right.show {
            transform: translate(0, -50%) scale(1);
        }

        .popup.bottom-left {
            bottom: var(--popup-offset);
            left: var(--popup-offset);
            transform: translateY(14px) scale(0.97);
        }

        .popup.bottom-left.show {
            transform: translateY(0) scale(1);
        }

        .popup.bottom-center {
            bottom: var(--popup-offset);
            left: 50%;
            transform: translate(-50%, 14px) scale(0.97);
        }

        .popup.bottom-center.show {
            transform: translate(-50%, 0) scale(1);
        }

        .popup.bottom-right {
            right: var(--popup-offset);
            bottom: var(--popup-offset);
            transform: translateY(14px) scale(0.97);
        }

        .popup.bottom-right.show {
            transform: translateY(0) scale(1);
        }

        /* ---------- Types ---------- */

        .popup.success {
            color: #166534;
            background: rgba(240, 253, 244, 0.97);
            border-color: rgba(34, 197, 94, 0.32);
            box-shadow:
                0 18px 45px rgba(22, 101, 52, 0.12),
                0 4px 12px rgba(22, 101, 52, 0.08);
        }

        .popup.error {
            color: #991b1b;
            background: rgba(254, 242, 242, 0.97);
            border-color: rgba(239, 68, 68, 0.32);
            box-shadow:
                0 18px 45px rgba(153, 27, 27, 0.12),
                0 4px 12px rgba(153, 27, 27, 0.08);
        }

        .popup.warning {
            color: #92400e;
            background: rgba(255, 251, 235, 0.97);
            border-color: rgba(245, 158, 11, 0.36);
            box-shadow:
                0 18px 45px rgba(146, 64, 14, 0.12),
                0 4px 12px rgba(146, 64, 14, 0.08);
        }

        .popup.info {
            color: #1e40af;
            background: rgba(239, 246, 255, 0.97);
            border-color: rgba(59, 130, 246, 0.32);
            box-shadow:
                0 18px 45px rgba(30, 64, 175, 0.12),
                0 4px 12px rgba(30, 64, 175, 0.08);
        }

        .popup.loading {
            color: #334155;
            background: rgba(248, 250, 252, 0.97);
            border-color: rgba(100, 116, 139, 0.26);
        }

        /* ---------- Content ---------- */

        .popup-status-icon {
            width: 26px;
            height: 26px;
            flex: 0 0 26px;

            display: none;
            align-items: center;
            justify-content: center;

            color: #ffffff;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: 800;

            border-radius: 50%;
        }

        .popup.success .popup-status-icon {
            display: flex;
            background: #22c55e;
        }

        .popup.error .popup-status-icon {
            display: flex;
            background: #ef4444;
        }

        .popup.warning .popup-status-icon {
            display: flex;
            background: #f59e0b;
        }

        .popup.info .popup-status-icon {
            display: flex;
            background: #3b82f6;
        }

        .popup-message {
            flex: 1;
            min-width: 0;

            color: inherit;
            font-family:
                Inter,
                ui-sans-serif,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.45;

            overflow-wrap: anywhere;
        }

        .popup-spinner {
            width: 20px;
            height: 20px;
            flex: 0 0 20px;

            display: none;

            border: 2.5px solid rgba(100, 116, 139, 0.24);
            border-top-color: #475569;
            border-radius: 50%;

            animation: popup-spin 750ms linear infinite;
        }

        .popup.loading .popup-spinner {
            display: block;
        }

        .popup-close {
            width: 28px;
            height: 28px;
            flex: 0 0 28px;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 0;

            color: currentColor;
            background: transparent;
            border: 0;
            border-radius: 8px;

            font-size: 20px;
            line-height: 1;

            opacity: 0.58;
            cursor: pointer;

            transition:
                opacity 150ms ease,
                background-color 150ms ease;
        }

        .popup-close:hover {
            opacity: 1;
            background: rgba(15, 23, 42, 0.07);
        }

        .popup-close:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 1px;
        }

        /* ---------- Progress ---------- */

        .popup-progress-track {
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;

            height: 3px;
            overflow: hidden;

            background: rgba(15, 23, 42, 0.06);
        }

        .popup-progress {
            width: 100%;
            height: 100%;

            background: currentColor;
            opacity: 0.65;

            transform-origin: left center;
            transform: scaleX(0);
        }

        .popup-progress.active {
            animation: popup-progress var(--popup-duration) linear forwards;
        }

        @keyframes popup-spin {
            to {
                transform: rotate(360deg);
            }
        }

        @keyframes popup-progress {
            from {
                transform: scaleX(1);
            }

            to {
                transform: scaleX(0);
            }
        }

        /* ---------- Responsive ---------- */

        @media (max-width: 640px) {
            :root {
                --popup-offset: 16px;
            }

            .popup {
                width: calc(100vw - 32px);
                min-width: 0;
                max-width: none;
            }

            .popup.top-left,
            .popup.top-center,
            .popup.top-right {
                top: var(--popup-offset);
                right: 16px;
                left: 16px;
            }

            .popup.bottom-left,
            .popup.bottom-center,
            .popup.bottom-right {
                right: 16px;
                bottom: var(--popup-offset);
                left: 16px;
            }

            .popup.top-left,
            .popup.top-right {
                transform: translateY(-14px) scale(0.97);
            }

            .popup.top-left.show,
            .popup.top-right.show {
                transform: translateY(0) scale(1);
            }

            .popup.top-center {
                transform: translateY(-14px) scale(0.97);
            }

            .popup.top-center.show {
                transform: translateY(0) scale(1);
            }

            .popup.bottom-left,
            .popup.bottom-right {
                transform: translateY(14px) scale(0.97);
            }

            .popup.bottom-left.show,
            .popup.bottom-right.show {
                transform: translateY(0) scale(1);
            }

            .popup.bottom-center {
                transform: translateY(14px) scale(0.97);
            }

            .popup.bottom-center.show {
                transform: translateY(0) scale(1);
            }
        }

        @media (prefers-color-scheme: dark) {
            .popup {
                color: #e2e8f0;
                background: rgba(15, 23, 42, 0.96);
                border-color: rgba(148, 163, 184, 0.22);
            }

            .popup.success {
                color: #bbf7d0;
                background: rgba(20, 83, 45, 0.96);
                border-color: rgba(74, 222, 128, 0.3);
            }

            .popup.error {
                color: #fecaca;
                background: rgba(127, 29, 29, 0.96);
                border-color: rgba(248, 113, 113, 0.3);
            }

            .popup.warning {
                color: #fde68a;
                background: rgba(120, 53, 15, 0.96);
                border-color: rgba(251, 191, 36, 0.3);
            }

            .popup.info {
                color: #bfdbfe;
                background: rgba(30, 58, 138, 0.96);
                border-color: rgba(96, 165, 250, 0.3);
            }

            .popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .popup,
            .popup-close {
                transition: none;
            }

            .popup-spinner {
                animation-duration: 1.5s;
            }
        }
    `;

    document.head.appendChild(style);
}

function initialize() {
    if (popupElement) {
        return;
    }

    injectStyles();

    popupElement = document.createElement("div");
    popupElement.id = "global-popup";
    popupElement.className = "popup top-center";
    popupElement.setAttribute("role", "status");
    popupElement.setAttribute("aria-live", "polite");
    popupElement.setAttribute("aria-atomic", "true");

    popupElement.innerHTML = `
        <div class="popup-spinner" aria-hidden="true"></div>

        <div class="popup-status-icon" aria-hidden="true"></div>

        <span class="popup-message"></span>

        <button
            type="button"
            class="popup-close"
            aria-label="Close notification"
            title="Close"
        >
            ×
        </button>

        <div class="popup-progress-track" aria-hidden="true">
            <div class="popup-progress"></div>
        </div>
    `;

    document.body.appendChild(popupElement);

    spinnerElement = popupElement.querySelector(".popup-spinner");
    iconElement = popupElement.querySelector(".popup-status-icon");
    messageElement = popupElement.querySelector(".popup-message");
    closeButtonElement = popupElement.querySelector(".popup-close");
    progressElement = popupElement.querySelector(".popup-progress");

    closeButtonElement.addEventListener("click", () => {
        Popup.hide();
    });
}

function ensureReady() {
    if (!popupElement) {
        initialize();
    }
}

function clearTimers() {
    clearTimeout(hideTimer);
    clearTimeout(progressTimer);

    hideTimer = null;
    progressTimer = null;
}

function normalizePosition(position) {
    return VALID_POSITIONS.has(position)
        ? position
        : "top-center";
}

function restartProgress(delay) {
    progressElement.classList.remove("active");
    progressElement.style.setProperty(
        "--popup-duration",
        `${delay}ms`
    );

    // Buộc trình duyệt khởi động lại animation.
    void progressElement.offsetWidth;

    progressElement.classList.add("active");
}

function display({
    message,
    type = "info",
    position = "top-center",
    loading = false,
    autoHide = true,
    delay = 3000,
    closable = true,
    showProgress = true
}) {
    ensureReady();
    clearTimers();

    const safePosition = normalizePosition(position);
    const popupType = loading ? "loading" : type;

    popupElement.className = [
        "popup",
        "show",
        popupType,
        safePosition
    ].filter(Boolean).join(" ");

    popupElement.setAttribute(
        "role",
        type === "error" ? "alert" : "status"
    );

    popupElement.setAttribute(
        "aria-live",
        type === "error" ? "assertive" : "polite"
    );

    messageElement.textContent =
        message || "Notification";

    spinnerElement.style.display =
        loading ? "block" : "none";

    iconElement.textContent =
        POPUP_ICONS[type] || POPUP_ICONS.info;

    closeButtonElement.style.display =
        closable ? "flex" : "none";

    progressElement.classList.remove("active");
    progressElement.parentElement.style.display =
        autoHide && showProgress ? "block" : "none";

    if (autoHide) {
        if (showProgress) {
            restartProgress(delay);
        }

        hideTimer = setTimeout(() => {
            Popup.hide();
        }, delay);
    }
}

export const Popup = {
    /**
     * Hiển thị trạng thái đang xử lý.
     */
    show(message, options = {}) {
        display({
            message,
            loading: true,
            type: "info",
            autoHide: false,
            showProgress: false,
            ...options
        });
    },

    loading(message, options = {}) {
        display({
            message,
            loading: true,
            type: "info",
            autoHide: false,
            showProgress: false,
            ...options
        });
    },

    success(message, delayOrOptions = 3000) {
        const options =
            typeof delayOrOptions === "number"
                ? { delay: delayOrOptions }
                : delayOrOptions;

        display({
            message,
            type: "success",
            delay: 3000,
            ...options
        });
    },

    error(message, delayOrOptions = 4000) {
        const options =
            typeof delayOrOptions === "number"
                ? { delay: delayOrOptions }
                : delayOrOptions;

        display({
            message,
            type: "error",
            delay: 4000,
            ...options
        });
    },

    warning(message, delayOrOptions = 4000) {
        const options =
            typeof delayOrOptions === "number"
                ? { delay: delayOrOptions }
                : delayOrOptions;

        display({
            message,
            type: "warning",
            delay: 4000,
            ...options
        });
    },

    info(message, delayOrOptions = 3000) {
        const options =
            typeof delayOrOptions === "number"
                ? { delay: delayOrOptions }
                : delayOrOptions;

        display({
            message,
            type: "info",
            delay: 3000,
            ...options
        });
    },

    hide() {
        if (!popupElement) {
            return;
        }

        clearTimers();
        progressElement?.classList.remove("active");
        popupElement.classList.remove("show");
    }
};

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initialize,
        { once: true }
    );
} else {
    initialize();
}