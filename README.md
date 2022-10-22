# MetaPoly

##AWS Account Details
Username: hello@metapoly.de 
PW: itLdzMzzAYCu2v6

##Mongo DB Account Details
User: hello@metapoly.de
PW: mAYsADgsHUxz7CY

## Connecting to the aws Server via SSH
To connect to the MetaPoly server type ssh -i "<PATH_TO_metapoly-server.pem> ubuntu@ec2-18-156-171-164.eu-central-1.compute.amazonaws.com
## Installation

MetaPoly requires [Node.js](https://nodejs.org/) v8+ and MongoDB v4 to run.

Install the dependencies and devDependencies and start the server.

```sh
$ cd metapoly-api
$ npm install
$ npm run dev
```

For production environments...

```sh
$ cd metapoly-api
$ npm run production
```

### Setting MongoDB Url & Other Configurations
- You can set your preferred mongoDB URI, JWT secret and other configs in .env file

NODE_ENV=development pm2 start pm2config.js
NODE_ENV=production pm2 start pm2config.js

pm2 start --name metapoly-app

### Setting up a new domain

- Go to AWS Route53
  - create record with subdomain name, add private ip of server
  - For https, get certificate: sudo certbot --nginx -d your_domain -d your_domain
