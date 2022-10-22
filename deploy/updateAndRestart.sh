#!/bin/bash

# any future command that fails will exit the script
set -e

cd /var/www/html/metapoly_devserver

git checkout .
git pull origin develop

#install npm packages
echo "Running npm install"
npm install

#Restart the node server
pm2 restart dev-back-end