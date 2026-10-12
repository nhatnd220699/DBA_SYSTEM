export const ActionLock = {
    locks: new Set(),

    acquire: function (key) {
        if (this.locks.has(key)) {
            return false;
        }

        this.locks.add(key)
        return true;
    },

    release: function (key) {
        this.locks.delete(key);
    }
}