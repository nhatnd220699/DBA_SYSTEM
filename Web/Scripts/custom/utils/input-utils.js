export const InputUtils = {

    phoneVN(value) {

        const digits = String(value ?? '').replace(/\D/g, '').slice(0, 10);

        if (digits.length === 0) return '';

        if (digits[0] !== '0') return '';

        if (digits.length > 1 && !/^0[35789]/.test(digits)) {
            return digits[0];
        }

        return digits;

    },

    uppercaseOnly(value) {
        return String(value ?? '').toUpperCase();
    },

    // Chỉ cho phép chữ cái (A-Z)
    lettersOnly(value) {
        return String(value ?? '')
            .replace(/[^a-zA-Z]/g, '');
    },

    // Chỉ số dương
    digitsOnly(value, maxLength) {

        maxLength = Number(maxLength);

        value = value.replace(/\D/g, '');

        if (!Number.isNaN(maxLength) && maxLength > 0) {
            value = value.slice(0, maxLength);
        }

        return value;

    },

    // Số nguyên (âm hoặc dương)
    integerOnly(value, maxLength) {
        value = String(value ?? '')
            .replace(/[^\d-]/g, '')
            .replace(/(?!^)-/g, '');

        if (maxLength > 0) {
            const isNegative = value.startsWith('-');

            value = isNegative
                ? '-' + value.slice(1, maxLength + 1)
                : value.slice(0, maxLength);
        }

        return value;
    },

    decimalOnly(value, allowNegative = false) {
        value = String(value ?? '');

        // Giữ lại số, dấu chấm và dấu âm
        value = value.replace(allowNegative ? /[^\d.-]/g : /[^\d.]/g, '');

        // Chỉ cho phép 1 dấu chấm
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }

        // Chỉ cho phép dấu âm ở đầu
        if (allowNegative) {
            value = value.replace(/(?!^)-/g, '');
        } else {
            value = value.replace(/-/g, '');
        }

        return value;
    },

    // Chỉ cho phép chữ và số
    alphaNumericOnly(value) {
        return String(value ?? '')
            .replace(/[^a-zA-Z0-9]/g, '');
    },

    // Loại bỏ khoảng trắng
    removeSpaces(value) {
        return String(value ?? '').replace(/\s+/g, '');
    },

    removeAccents(value) {
        return String(value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
    },

    uppercaseNoAccent(value) {
        value = String(value ?? '');
        value = InputUtils.removeAccents(value);
        value = InputUtils.alphaNumericOnly(value);
        value = InputUtils.uppercaseOnly(value);

        return value;
    },
}