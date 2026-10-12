export const NumberUtils = {

    toNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
    }

};