#!/bin/bash

if test $# -lt 1; then
  echo Usage: `basename $0` HOSTNAME [USER]
  echo Setup HOSTNAME with passwordless ssh and sudo
  exit 1
fi
HOST=$1
USER=${2:-$USER}

# check key
if ! [ -e ~/.ssh/id_rsa.pub ]; then
    ssh-keygen
fi

# copy key to host
ssh-copy-id -i $USER@$HOST

# sudo without password
ssh -t $USER@$HOST "sudo sh -c 'echo $USER ALL=NOPASSWD: ALL > /etc/sudoers.d/$USER-all-nopasswd'"

# ssh host config if needed:

#cat >>~/.ssh/config <<!
#
#Host $2
#StrictHostKeyChecking no
#User $1
#!

echo $USER@$HOST setup complete
