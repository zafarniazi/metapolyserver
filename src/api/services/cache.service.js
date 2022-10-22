const NodeCache = require('node-cache');
const appCache = new NodeCache({ stdTTL: 1800 });

module.exports = {

	getData(key) {
		if (typeof key === 'object') {
			key = key.toString();
		}
		return appCache.get(key);
	},

	setData(key, value) {
		if (typeof key === 'object') {
			key = key.toString();
		}
		return appCache.set(key, value);
	},

	updateData(key, value) {
		if (typeof key === 'object') {
			key = key.toString();
		}
		const existingData = appCache.get(key);
		const updatedData = {
			...(existingData || {}),
			...value,
		};
		return appCache.set(key, updatedData);
	},

	removeData(key) {
		appCache.del(key);
	}
};