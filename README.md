<p align="center">
<a href="https://www.theatersoft.com">
<img alt="Theatersoft" title="Theatersoft" src="https://www.theatersoft.com/images/theatersoft-logo-text.svg" width="640">
</a>
</p>

## Theatersoft Home
> #### What is Theatersoft Home?
>* A smart home software platform written in modern JavaScript with Node.js servers, web browser clients with touch enabled UI for controlling all aspects of your home, and device service modules for popular home automation device protocols.
>* The open source platform currently includes home automation, control, monitoring, security, camera surveillance, and is easily extensible.
>* The platform is highly flexible and enables a distributed system using multiple hosts, with service modules connecting devices wherever needed.

This repository contains automation to configure and install Theatersoft Home. This avoids creating a `config.json` site configuration file from scratch and performing every install step manually.

### Requirements
#### 1. **Linux**
Home can run on any reasonable hardware running recent Linux. Other service modules for device integration may have their own requirements. `systemd` is needed to use the installed services files.

#### 2. **Node.js**
v7.6.0 or later is needed since all modules are built assuming native async support.
>[nvm](https://github.com/creationix/nvm) is recommended for painless Node.js version management:
>```
>wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.1/install.sh | bash
>#close and reopen terminal
>nvm install 7
>```
>The services require node to be found at `/usr/local/bin`:
>```
>n=$(which node); n=${n%/node}
>sudo ln -sf $n/node /usr/local/bin/node
>sudo ln -sf $n/npm /usr/local/bin/npm
>```

### Installation
> #### NEW: see [www.theatersoft.com/install](https://www.theatersoft.com/install/) for complete install instructions on a Raspberry Pi 3
**1. Install @theatersoft/home**
```
mkdir site; cd site; npm install @theatersoft/home
```

**2. Configure**
```
npm explore @theatersoft/home npm run config
```
>Upon completion your `site` directory contains:
>```
>├── config.json
>├── deploy
>├── node_modules
>└── package.json
>```
> `config.json` is your site configuration. When you change the configuration to add hosts or services you may need to repeat the config and deploy steps.
>
>The `deploy` directory contains customized deployment files for each host in the configuration.
>
>The `node_modules` directory contains `home` dependencies.
>
>`package.json` contains npm scripts:
>* `config`
>* `deploy`
>
> ...and also `journal`, `restart`, and `stop` scripts for managing the system service.

**4. Deploy to host(s)**
>**Server certificate installation**
>
>You'll need to access the server through a valid domain name with a trusted TLS certificate to satisfy modern browsers. Without getting too detailed:
>1. Register a domain name
>2. If you have a dynamic IP address use a dynamic dns client e.g. `ddclient` to update your provider's name server.
>3. Forward ports 80 and 443 from the internet to your server in your router settings.
>4. The [greenlock](https://git.daplie.com/Daplie/node-greenlock) [Let's Encrypt](https://letsencrypt.org/) client is integrated with the server to provide a free and automatic certificate for your domain. Edit `config.json`;  remove the underscore from the config key and provide your own values for `domain` and `email`:
>
>```
>"_letsencrypt": {
>    "domain": "example.com",
>    "email": "email@example.com",
>    "production": true
>}
>```

Run the host deploy script. (If you've configured multiple hosts there will be an npm script for each host that can be used to deploy individual hosts.)
```
npm run deploy
```
The first deploy to the local host will prompt for sudo password. It needs to create `/opt/theatersoft`, install `authbind`, and install the service.

The deploy process installs the platform server [@theatersoft/server](https://www.npmjs.com/package/@theatersoft/server) along with any configured service modules. On the local root server [@theatersoft/client](https://www.npmjs.com/package/@theatersoft/client) is also installed.

>The systemd `theatersoft.service` is started and enabled to restart automatically after reboot.  The usual management commands also apply, e.g.:
>```
>systemctl status theatersoft
>systemctl stop theatersoft
>systemctl start theatersoft
>```

**5. Start a client**

Use the current stable version of Chrome to run the client web app.

* Open `https://localhost`
* Enter `0000` at the passcode screen.
(Change config.password if desired.)
NOTE Upcoming client pairing removes insecure password login.

### Other Administration Tasks

### Configure port forwarding for external network access

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
