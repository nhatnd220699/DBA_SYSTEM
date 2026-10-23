
/**
 * Toast Notification Module
 * ES Module | Vanilla JavaScript | Tailwind CSS
 */

const POSITIONS = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
];

const DEFAULTS = {
    position: 'top-right',
    duration: 3800,
    maxVisible: 5,
    gap: 12,
    closeButton: true,
    pauseOnHover: true,
    newestOnTop: true,
    animationDuration: 300
};

const ICONS = {
    success: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="m8 12 2.5 2.5L16 9"/>
        </svg>`,
    error: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="m9 9 6 6m0-6-6 6"/>
        </svg>`,
    warning: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
            <path d="M12 9v4m0 3h.01"/>
        </svg>`,
    info: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 11v5m0-8h.01"/>
        </svg>`,
    loading: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round">
            <path d="M12 3a9 9 0 1 0 9 9"
                  stroke-dasharray="42 16"/>
        </svg>`,
    close: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round">
            <path d="m6 6 12 12M18 6 6 18"/>
        </svg>`
};

const STYLES = {
    success: {
        icon: 'success',
        classes: [
            'bg-emerald-50 dark:bg-[#06201b]',
            'text-emerald-700 dark:text-emerald-300',
            'border-emerald-300 dark:border-emerald-500/40',
            'shadow-emerald-200/30 dark:shadow-emerald-950/50'
        ]
    },
    error: {
        icon: 'error',
        classes: [
            'bg-rose-50 dark:bg-[#260a12]',
            'text-rose-700 dark:text-rose-300',
            'border-rose-300 dark:border-rose-500/40',
            'shadow-rose-200/30 dark:shadow-rose-950/50'
        ]
    },
    warning: {
        icon: 'warning',
        classes: [
            'bg-amber-50 dark:bg-[#241905]',
            'text-amber-800 dark:text-amber-300',
            'border-amber-300 dark:border-amber-500/40',
            'shadow-amber-200/30 dark:shadow-amber-950/50'
        ]
    },
    info: {
        icon: 'info',
        classes: [
            'bg-sky-50 dark:bg-[#0a172a]',
            'text-sky-700 dark:text-cyan-300',
            'border-sky-300 dark:border-cyan-500/40',
            'shadow-sky-200/30 dark:shadow-cyan-950/50'
        ]
    },
    loading: {
        icon: 'loading',
        classes: [
            'bg-white dark:bg-slate-900',
            'text-slate-700 dark:text-slate-200',
            'border-slate-200 dark:border-slate-700',
            'shadow-slate-200/50 dark:shadow-black/30'
        ]
    }
};

const ENTER_CLASSES = [
    'opacity-100',
    'translate-y-0',
    'scale-100'
];

const EXIT_CLASSES = [
    'opacity-0',
    'translate-y-2',
    'scale-95'
];

const containers = new Map();
const toasts = new Map();

let config = { ...DEFAULTS };
let sequence = 0;

function getPositionClasses(position) {
    const positions = {
        'top-left': 'top-4 left-4 items-start',
        'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
        'top-right': 'top-4 right-4 items-end',
        'bottom-left': 'bottom-4 left-4 items-start',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
        'bottom-right': 'bottom-4 right-4 items-end'
    };

    return positions[position];
}

function getContainer(position) {
    let container = containers.get(position);

    if (container?.isConnected) {
        return container;
    }

    container = document.createElement('div');
    container.dataset.toastPosition = position;
    container.className = [
        'fixed z-[9999] flex flex-col',
        'w-[calc(100%-2rem)] max-w-sm',
        'pointer-events-none',
        getPositionClasses(position)
    ].join(' ');

    container.style.gap = `${config.gap}px`;
    container.style.paddingTop = position.startsWith('top')
        ? 'env(safe-area-inset-top)'
        : '0';
    container.style.paddingBottom = position.startsWith('bottom')
        ? 'env(safe-area-inset-bottom)'
        : '0';

    document.body.appendChild(container);
    containers.set(position, container);

    return container;
}

function createIcon(name, extraClasses = '') {
    const wrapper = document.createElement('span');

    wrapper.className = [
        'inline-flex w-5 h-5 shrink-0 items-center justify-center',
        extraClasses,
        name === 'loading' ? 'animate-spin' : ''
    ].filter(Boolean).join(' ');

    // SVG chỉ lấy từ các hằng số tĩnh nội bộ của module.
    wrapper.innerHTML = ICONS[name] || ICONS.info;

    const svg = wrapper.querySelector('svg');

    if (svg) {
        svg.setAttribute('class', 'w-full h-full');
        svg.setAttribute('aria-hidden', 'true');
    }

    return wrapper;
}

function createElement(id, message, type, options) {
    const style = STYLES[type];
    const toast = document.createElement('div');

    toast.id = id;
    toast.dataset.toastId = id;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute(
        'aria-live',
        type === 'error' ? 'assertive' : 'polite'
    );

    toast.className = [
        'pointer-events-auto flex items-center gap-3',
        'w-full min-w-0 px-4 py-3 rounded-xl border',
        'shadow-2xl text-sm font-medium',
        'transform-gpu origin-center',
        'transition-all ease-out',
        'opacity-0 translate-y-2 scale-95',
        style.classes.join(' ')
    ].join(' ');

    toast.style.transitionDuration = `${config.animationDuration}ms`;

    const icon = createIcon(
        style.icon,
        type === 'loading'
            ? 'text-sky-600 dark:text-sky-400'
            : ''
    );

    const text = document.createElement('span');
    text.className = 'min-w-0 flex-1 break-words leading-5';
    text.textContent = String(message ?? '');

    toast.append(icon, text);

    if (options.closeButton ?? config.closeButton) {
        const closeButton = document.createElement('button');

        closeButton.type = 'button';
        closeButton.className = [
            'inline-flex w-7 h-7 shrink-0 items-center justify-center',
            'rounded-lg opacity-60 hover:opacity-100',
            'hover:bg-black/5 dark:hover:bg-white/10',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-current transition-opacity'
        ].join(' ');

        closeButton.setAttribute('aria-label', 'Đóng thông báo');
        closeButton.append(createIcon('close'));

        closeButton.firstElementChild.className = 'w-4 h-4';

        closeButton.addEventListener('click', () => dismiss(id));

        toast.appendChild(closeButton);
    }

    return toast;
}

function removeRecord(record) {
    clearTimeout(record.timer);
    clearTimeout(record.removeTimer);

    record.element.remove();
    toasts.delete(record.id);

    const container = containers.get(record.position);

    if (container && container.childElementCount === 0) {
        container.remove();
        containers.delete(record.position);
    }
}

function dismiss(id) {
    const record = toasts.get(id);

    if (!record || record.closing) return;

    record.closing = true;
    clearTimeout(record.timer);

    record.element.classList.remove(...ENTER_CLASSES);
    record.element.classList.add(...EXIT_CLASSES);

    record.removeTimer = setTimeout(() => {
        removeRecord(record);
    }, config.animationDuration);
}

function startTimer(record) {
    clearTimeout(record.timer);

    if (record.duration <= 0 || record.paused || record.closing) {
        return;
    }

    record.startedAt = Date.now();

    record.timer = setTimeout(() => {
        dismiss(record.id);
    }, record.remaining);
}

function show(message, options = {}) {
    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    if (typeof options === 'string') {
        options = { type: options };
    }

    const type = STYLES[options.type] ? options.type : 'info';

    const position = POSITIONS.includes(
        options.position ?? config.position
    )
        ? (options.position ?? config.position)
        : config.position;

    const rawDuration = Number(options.duration ?? config.duration);
    const duration = Number.isFinite(rawDuration)
        ? Math.max(0, rawDuration)
        : config.duration;

    const id = options.id ?? `toast-${++sequence}`;

    // Reuse ID safely without leaving an old removal timer behind.
    if (toasts.has(id)) {
        removeRecord(toasts.get(id));
    }

    const container = getContainer(position);
    const element = createElement(id, message, type, options);

    const record = {
        id,
        element,
        position,
        duration,
        remaining: duration,
        startedAt: 0,
        timer: null,
        removeTimer: null,
        paused: false,
        closing: false
    };

    if (options.pauseOnHover ?? config.pauseOnHover) {
        element.addEventListener('mouseenter', () => {
            if (record.closing || record.duration <= 0 || record.paused) {
                return;
            }

            record.paused = true;
            clearTimeout(record.timer);

            record.remaining = Math.max(
                0,
                record.remaining - (Date.now() - record.startedAt)
            );
        });

        element.addEventListener('mouseleave', () => {
            if (!record.paused || record.closing) return;

            record.paused = false;
            startTimer(record);
        });
    }

    if (config.newestOnTop) {
        container.prepend(element);
    } else {
        container.appendChild(element);
    }

    toasts.set(id, record);

    const maxVisible = Math.max(
        1,
        Math.floor(Number(options.maxVisible ?? config.maxVisible) || 5)
    );

    const records = [...toasts.values()].filter(
        item => item.position === position && !item.closing
    );

    while (records.length > maxVisible) {
        const oldest = records.shift();
        dismiss(oldest.id);
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (!toasts.has(id) || record.closing) return;

            element.classList.remove(...EXIT_CLASSES);
            element.classList.add(...ENTER_CLASSES);
        });
    });

    startTimer(record);

    return id;
}

function configure(options = {}) {
    if (
        options.position !== undefined &&
        !POSITIONS.includes(options.position)
    ) {
        throw new TypeError(`Invalid toast position: ${options.position}`);
    }

    if (options.gap !== undefined && (
        !Number.isFinite(Number(options.gap)) || Number(options.gap) < 0
    )) {
        throw new TypeError('Toast gap must be a non-negative number.');
    }

    if (options.maxVisible !== undefined && (
        !Number.isFinite(Number(options.maxVisible)) ||
        Number(options.maxVisible) < 1
    )) {
        throw new TypeError('Toast maxVisible must be at least 1.');
    }

    if (options.animationDuration !== undefined && (
        !Number.isFinite(Number(options.animationDuration)) ||
        Number(options.animationDuration) < 0
    )) {
        throw new TypeError(
            'Toast animationDuration must be non-negative.'
        );
    }

    Object.assign(config, options);

    for (const container of containers.values()) {
        container.style.gap = `${config.gap}px`;
    }

    return Toast;
}

function clear(position) {
    for (const record of [...toasts.values()]) {
        if (!position || record.position === position) {
            dismiss(record.id);
        }
    }
}

function clearImmediately() {
    for (const record of [...toasts.values()]) {
        removeRecord(record);
    }
}

function update(id, message, options = {}) {
    const previous = toasts.get(id);

    if (!previous) return show(message, { ...options, id });

    const position = options.position ?? previous.position;
    const type = options.type ?? 'info';
    const duration = options.duration ?? previous.duration;

    removeRecord(previous);

    return show(message, {
        ...options,
        id,
        type,
        position,
        duration
    });
}

export const Toast = Object.freeze({
    show,

    success: (message, options = {}) =>
        show(message, { ...options, type: 'success' }),

    error: (message, options = {}) =>
        show(message, { ...options, type: 'error' }),

    warning: (message, options = {}) =>
        show(message, { ...options, type: 'warning' }),

    info: (message, options = {}) =>
        show(message, { ...options, type: 'info' }),

    loading: (message, options = {}) =>
        show(message, { ...options, type: 'loading', duration: 0 }),

    dismiss,
    clear,
    clearImmediately,
    update,
    configure,

    get positions() {
        return [...POSITIONS];
    }
});

export default Toast;
