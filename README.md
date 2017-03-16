## Theatersoft Home
> #### What is Theatersoft Home?
> * A smart home software platform written in modern JavaScript with Node.js servers, web browser clients with touch enabled UI for controlling all aspects of your home, and device service modules for popular home automation device protocols.
>* The open source platform currently includes home automation, control, monitoring, security, camera surveillance, and is easily extensible.
>* The platform is highly flexible and enables a distributed system using multiple hosts, with service modules connecting devices wherever needed.

This repository contains automation to configure and install Theatersoft Home. This avoids creating a `config.json` site configuration file from scratch and performing every install step manually.

### Requirements
#### 1. **Linux**
Home can run on any reasonable hardware running recent Linux. Other service modules for device integration may have their own requirements. `systemd` is needed to use the installed services files.

#### 2. **Node.js**
v7.6.0 or later is needed since all modules are built assuming native async support. [nvm](https://github.com/creationix/nvm) is always advised for painless Node.js version management.

### Install
1. Download the Home repository

Since this package stores local site configuration, `git` is used to manage local changes.
```
git clone git@github.com:theatersoft/home.git
cd home
```

> At this point you should create a local branch to save any local site configuration.
> ```
> git checkout -b local
> ```

2. Install Home dependencies
```
npm install
```

4. Generate initial deployment

 The default site configuration is created from `config.json.template` the first time this step is performed. You will make changes to the generated `config.json` and repeat these steps as needed to add or modify host servers and services.

```
npm run config
```

> This step stages a set of customized deploy-<host> scripts in `package.json` and deployment files in the `deploy` directory so you should now `git commit -a` the changes to your `local` branch.

5. Deploy to each configured host

Run the deploy scripts individually to install each configured host. This installs the platform [@theatersoft/server](https://www.npmjs.com/package/@theatersoft/server) , [@theatersoft/client](https://www.npmjs.com/package/@theatersoft/client), and configured service modules.

```
npm run deploy-`hostname`
```
> The default install location is `/opt/theatersoft`. The `package.json` file in that directory contains operational scripts.

6. Start the platform manually.
```
cd /opt/theatersoft
npm run start
```

7. Start a client

Use the current stable version of Chrome to run the client web app.

* Open `https://localhost`

* Enter `0000` at the passcode screen. (Change config.password if desired.) NOTE Upcoming client pairing removes insecure password login.

### Other Administration Tasks

### Configure port forwarding for external clients

### Using Self-signed Server Certificates in Chrome
Open `chrome://settings/certificates`

Select the SERVERS tab

`IMPORT` */opt/theatersoft/.config/theatersoft/server.cer*


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

## Support and contributing
https://github.com/theatersoft
