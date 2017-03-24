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
**1. Download the Home repository**

Since this package stores local site configuration, `git` is used to manage local changes.
```
git clone git@github.com:theatersoft/home.git
cd home
```

> At this point you should create a local branch to save any local site configuration.
> ```
> git checkout -b local
> ```

**2. Install Home dependencies**
```
npm install
```

**3. Configure the deployment**

```
npm run config
```

 The default site configuration `config.json` is created from a template if it does not exist (e.g. first run). Whenever you change the configuration to add hosts or services you need to repeat the config and deploy steps.

> This step also stages custom `deploy-<host>` scripts in `package.json` and deployment files in the `deploy` directory. You should `git commit -a` configuration changes to your `local` branch.

**4. Deploy to host(s)**

Run the host deploy scripts individually. They install the platform server [@theatersoft/server](https://www.npmjs.com/package/@theatersoft/server) along with any configured service modules and also [@theatersoft/client](https://www.npmjs.com/package/@theatersoft/client) on localhost.

> **One time predeployment for root server only**
> * `npm run mkdir` before the first deploy to create the destination directory `/opt/theatersoft`. The `sudo` command will prompt for password.
> * `npm run authbind` in order to use the normally privileged HTTPS port 443 as a normal user.

```
npm run deploy-${HOSTNAME}
```

> **Server certificate installation**
> (TODO Deploy self signed `server.cer` and `server.key` in `/opt/theatersoft/.config/theatersoft`)
> You'll need to access the server through a valid domain name using a trusted TLS certificate to satisfy modern browsers. Without going into too many specifics:
> 1. Register a domain name
>
> 2. If you have a dynamic IP address use a dynamic dns client e.g. `ddclient` to update your provider's name server.
>
> 3. Get your SSL/TLS domain certificate and install `server.cer` and `server.key` in `/opt/theatersoft/.config/theatersoft`
>
>**NEW** The [greenlock](https://git.daplie.com/Daplie/node-greenlock) [Let's Encrypt](https://letsencrypt.org/) client is now integrated into the server. To enable, remove the underscore from this config key and use your actual `domain` and `email` values:
>   ```
>  "_letsencrypt": {
>    "domain": "example.com",
>    "email": "email@example.com",
>    "production": true
>  }
>   ```
>    Make sure ports 80 and 443 are port forwarded from the internet and you'll automatically get a free certificate.

**5. Start the platform**
```
cd /opt/theatersoft
npm run start
```
> Install systemd services so the platform boots up automatically.
  TODO generate and install the service files from the templates in `system`.

**6. Start a client**

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
