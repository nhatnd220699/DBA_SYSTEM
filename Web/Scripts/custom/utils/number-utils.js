export const NumberUtils = {

    toNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
    },

    formatNumber(value, decimalPlaces = 2) {
        const num = Number(value);

        if (!Number.isFinite(num)) {
            return value;
        }

        return parseFloat(num.toFixed(decimalPlaces));
    }
};