# Theatersoft Home
This repository contains the site configuration and deployment automation used to install and manage Theatersoft Home.

> ### What is Theatersoft Home?
> * A smart home software platform written in modern JavaScript with Node.js servers, web browser clients with touch enabled UI for controlling all aspects of your home, and device service modules for popular home automation device protocols.
>* The open source platform currently includes home automation, control, monitoring, security, camera surveillance, and is easily extensible.
>* The platform is highly flexible and enables a distributed system using multiple hosts, with service modules connecting devices wherever needed.

## Requirements
### 1. **Linux**
 Any reasonable hardware and recent Linux supporting systemd should be fine.
### 2. **Node.js (>= 7.6.0)**

 [nvm](https://github.com/creationix/nvm) is always advised for painless Node.js version management.

## Install
1. Since this package stores local site configuration, `git` is used to manage local changes.
```
git clone git@github.com:theatersoft/home.git
cd home
```

> At this point you should create a local branch to save any local site configuration.
> ```
> git checkout -b local
> ```

2. Install the package dependencies.
```
npm install
```

3. **Now edit config.json**

    TODO automate initialization of localhost: {name, host, mac}

    Add additional hosts. TODO doc



4. The next step packs and stages the installed packages so they can be copied and installed to the deployment locations, both locally and on remote hosts. This is required if any local packages have unpublished changes during development. (If developers prefer the npm link approach it is also supported with link scripts in every package.)

```
npm run config
```

> The config step added a set of customized deploy-<host> scripts in `package.json` and populated files in the `deploy` directory so you should now `git commit -a` the changes.

5. Run the deploy scripts individually to install each configured host. This installs the platform [@theatersoft/server](https://www.npmjs.com/package/@theatersoft/server) , [@theatersoft/client](https://www.npmjs.com/package/@theatersoft/client), and configured service modules.

```
npm run deploy-<hostname>
```
> The default install location is `/opt/theatersoft`. The `package.json`file in that directory contains several scripts for host management and operation.

6. Start the platform manually.
```
cd /opt/theatersoft
npm run start
```

### Client Browser
Use the current stable version of Chrome to run the client web app.

### Client Pairing
Open `https://localhost`

### Using Self-signed Server Certificates in Chrome
Open `chrome://settings/certificates`

Select the SERVERS tab

`IMPORT` */opt/theatersoft/.config/theatersoft/server.cer*

### Configure port forwarding for external clients

### Use a custom domain name

### Add another host server

### Add a service module

Add services, e.g.:
```
        {
          "enabled": true,
          "module": "@theatersoft/zwave",
          "export": "ZWave",
          "name": "ZWave",
          "config": {
            "port": "/dev/zwave",
              "options": {
              "Logging": true,
              "ConsoleOutput": true,
              "SaveLogLevel": 6
            }
          }
        }
```

## Support
https://github.com/theatersoft

## Contribute
https://github.com/theatersoft