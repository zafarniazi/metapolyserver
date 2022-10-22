const nodemailer = require('nodemailer');


const currentMailConfig = {
	host: 'smtp.ionos.de',
	port: 587,
	auth: {
		user: 'help@metapoly.app',
		pass: 'Ih1PW@Metapoly'
	}
};

const transporter = nodemailer.createTransport(currentMailConfig);

// verify connection configuration
transporter.verify(function (error, success) {
	if (error) {
		console.log('Email Transport verification error:', error);
	} else {
		console.log('Server is ready to take our messages');
	}
});

module.exports = {
	SchemaDefinition: {
		timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
	},
	sendmail: (mailObj, successCallback, errorCallback) => {
		transporter.sendMail({
			from: 'Metapoly <help@metapoly.app>', // sender address
			to: mailObj.to, // list of receivers
			subject: mailObj.subject, // Subject line
			text: mailObj.text, // plain text body
			html: mailObj.html // html body
		}).then(success => {
			console.log(success);
			successCallback(success);
		}).catch(error => {
			console.log(error);
			errorCallback(error);
		});
	}
};