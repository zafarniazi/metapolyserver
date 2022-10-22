const fs = require('fs');
const AdminUser = require('../api/models/admin-user.model');

/**
* Common Configs
*
* @returns {object} Common Configs
* @public
*/
module.exports = {
	createDirectory: (folder_name) => {
		if (!fs.existsSync(folder_name)) {
			fs.mkdirSync(folder_name);
		}
	},
	createEventsFile: () => {
		if (!fs.existsSync("events/events.csv")) {
			fs.copyFileSync("events/events_LogFields.csv", "events/events.csv");
		}
	},
	async registerAdminUser() {
		try {
			const adminUserCredentials = {
				email: 'admin@metapoly.com',
				password: 'admin@#$metapoly'
			};
			const adminUserExists = await AdminUser.countDocuments({}).exec();
			if (!adminUserExists) {
				await AdminUser.create(adminUserCredentials);
			}
		} catch (error) {
			console.log('error while creating admin user', error);
		}
	},
};

