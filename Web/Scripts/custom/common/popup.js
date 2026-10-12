let popupElement;
let messageElement;
let spinnerElement;
let hideTimer;

function injectStyles() {
    if (document.getElementById("popup-style")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "popup-style";

    style.textContent = `
        .popup {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) scale(.95);
            background: #333;
            color: #fff;
            padding: 12px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 99999;
            opacity: 0;
            pointer-events: none;
            transition: all .3s ease;
        }

        .popup.show {
            opacity: 1;
            transform: translateX(-50%) scale(1);
        }

        .popup.success {
            background: #2e7d32;
        }

        .popup.error {
            background: #c62828;
        }

        .popup.warning {
            background: #ed6c02;
        }

        .popup-spinner {
            width: 16px;
            height: 16px;
            border: 3px solid #ccc;
            border-top-color: #fff;
            border-radius: 50%;
            animation: popup-spin 1s linear infinite;
        }

        @keyframes popup-spin {
            to {
                transform: rotate(360deg);
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
    popupElement.className = "popup";

    popupElement.innerHTML = `
        <div class="popup-spinner"></div>
        <span></span>
    `;

    document.body.appendChild(popupElement);

    spinnerElement =
        popupElement.querySelector(".popup-spinner");

    messageElement =
        popupElement.querySelector("span");
}

function ensureReady() {

    if (!popupElement) {
        initialize();
    }
}

function display({
    message,
    type = "",
    loading = false,
    autoHide = false,
    delay = 3000
}) {

    ensureReady();

    clearTimeout(hideTimer);

    popupElement.className =
        `popup show ${type}`.trim();

    spinnerElement.style.display =
        loading
            ? "block"
            : "none";

    messageElement.textContent =
        message;

    if (autoHide) {

        hideTimer =
            setTimeout(
                () => Popup.hide(),
                delay
            );
    }
}

export const Popup = {

    show(message) {

        display({
            message,
            loading: true
        });
    },

    success(message, delay = 3000) {

        display({
            message,
            type: "success",
            autoHide: true,
            delay
        });
    },

    error(message, delay = 4000) {

        display({
            message,
            type: "error",
            autoHide: true,
            delay
        });
    },

    warning(message, delay = 4000) {

        display({
            message,
            type: "warning",
            autoHide: true,
            delay
        });
    },

    hide() {

        if (!popupElement) {
            return;
        }

        popupElement.classList.remove(
            "show"
        );
    }
};

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

} else {

    initialize();
}