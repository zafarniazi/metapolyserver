#!/bin/bash

# any future command that fails will exit the script
set -e
# Lets write the public key of our aws instance
eval $(ssh-agent -s)
echo "$PRIVATE_KEY" | tr -d '\r' | ssh-add - > /dev/null

# ** Alternative approach
# echo -e "$PRIVATE_KEY" > /root/.ssh/id_rsa
# chmod 600 /root/.ssh/id_rsa
# ** End of alternative approach

# disable the host key checking.
chmod +x ./deploy/disableHostKeyChecking.sh
./deploy/disableHostKeyChecking.sh

echo "deploying to ${DEPLOY_SERVER}"
ssh ubuntu@${DEPLOY_SERVER} 'bash -s' < ./deploy/updateAndRestart.sh

