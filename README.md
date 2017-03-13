# Theatersoft Home
This is the site configuration and deployment automation to install and manage a Theatersoft Home system including all client, server and service modules required by the local configuration.

1. `npm run config`
    * Prepares package.json files with configured service dependencies for each host in config.json.
    * Packs a snapshots of each local Theatersoft dependency package.
2. `npm run deploy`
    * One step deployment.
    * (See notes for initial setup.)
3. `npm run start`
`npm run stop`

## Install
Since this package will store local site configuration, `git clone`` the repository and use git to manage all local changes.
```
git clone git@github.com:theatersoft/home.git
cd home
npm install
npm run config
npm run deploy
npm run start
```
### Client Browser
Use the current stable version of Chrome to run the client web app.

### Client Certificate Trust
Open `chrome://settings/certificates`
Select the SERVERS tab
`IMPORT` */opt/theatersoft/.config/theatersoft/server.cer*

### Client Pairing
Open `https://localhost`

### Configure port forwarding for external clients

### Use a custom domain name

### Add another host server

### Add a service module

## Support
https://github.com/theatersoft

## Contribute
https://github.com/theatersoft