export function renderIcon(name, className = 'w-5 h-5 shrink-0') {
    return `
        <svg class="${className}" aria-hidden="true">
            <use href="/Content/icons/sprite.svg#${name}"></use>
        </svg>
    `;
}