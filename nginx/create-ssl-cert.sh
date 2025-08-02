#!/bin/bash

# Create directory structure for certificates
mkdir -p /etc/letsencrypt/live/guardant.me

# Generate self-signed certificate for *.guardant.me
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/guardant.me/privkey.pem \
    -out /etc/letsencrypt/live/guardant.me/fullchain.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=*.guardant.me"

echo "Self-signed certificate created for *.guardant.me"