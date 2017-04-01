'use strict'
require('shelljs/make')
const
    fs = require('fs'),
    path = require('path'),
    DEST = '/opt/theatersoft',
    DEST_CONFIG_THEATERSOFT = `${DEST}/.config/theatersoft`,
    SITE = path.normalize(`${process.cwd()}/../../..`),
    CONFIG = `${SITE}/config.json`,
    PACKAGE = `${SITE}/package.json`,
    DEPLOY = `${SITE}/deploy`,
    hostname = require('os').hostname(),
    isRoot = host => host === hostname,
    execo = c => exec(c, {silent: true}).stdout.trim(),
    write = (file, text) => fs.writeFileSync(file, text, 'utf-8'),
    writeJson = (file, json) => fs.writeFileSync(file, JSON.stringify(json, null, '  '), 'utf-8'),
    log = console.log,
    exists = f => {
        try {
            fs.accessSync(f);
            return true
        } catch (e) {return false}
    },
    pkg = require('./package.json'),
    cfg = (!exists(CONFIG) && exec(`sed 's/{{HOSTNAME}}/${hostname}/' config.json.template > ${CONFIG}`), require(CONFIG)),
    sitePkg = (!exists(PACKAGE) && exec(`cp package.template.json ${PACKAGE}`), require(PACKAGE)),
    {hosts = []} = cfg,
    execa = c => new Promise(r => exec(c, (code, stdout, stderr) => r()))

function hostPackage (host, dependencies) {
    log(`${host}\n`, dependencies)
    exec(`mkdir -p ${DEPLOY}/${host}`)
    const link = Object.keys(dependencies).map(d => `npm link ${d}`).join('; ')
    const start = `${pkg.deployScripts.start}${isRoot(host) ? '' : '-child'}`
    writeJson(`${DEPLOY}/${host}/package.json`, Object.assign({}, pkg, {
        dependencies,
        scripts: Object.assign({}, pkg.deployScripts, {link}, {start}),
        deployScripts: undefined
    }))
}

function hostEnv (host) {
    if (exists(`${DEPLOY}/${host}/.bus`)) return
    // Create bus env
    process.env.XDG_CONFIG_HOME = `${DEST}/.config`
    const
        {createSession} = require('@theatersoft/server'),
        auth = createSession(host, undefined, '@theatersoft/home')
    if (host === hostname) {
        write(`${DEPLOY}/${host}/.root`, `PORT=443\n`)
        write(`${DEPLOY}/${host}/.bus`, `BUS=wss://localhost\nAUTH=${auth}\n`)
    } else {
        write(`${DEPLOY}/${host}/.bus`, `BUS=wss://${hostname}.local\nAUTH=${auth}\n`)
    }
}

function hostSystem (host) {
    const
        root = host === hostname,
        {cameras} = hosts.find(({name}) => name === host),
        BUS = root ? '.root' : '.bus',
        AUTHBIND = root ? '/usr/bin/authbind ' : ''
    exec(`sed -e "s/{{USER}}/$USER/" -e 's/{{BUS}}/${BUS}/' -e 's|{{AUTHBIND}}|${AUTHBIND}|' system/theatersoft.service.template > ${DEPLOY}/${host}/theatersoft.service`)
    cameras && exec(`sed "s/{{USER}}/$USER/" system/theatersoft-capture.service.template > ${DEPLOY}/${host}/theatersoft-capture.service`)
}

const targets = {
    config () {
        log('target config')
        exec(`mkdir -p ${DEPLOY}`)
        const
            find = module => execo(`(cd ${SITE}; npm explore ${module} pwd)`),
            pack = path => sitePkg.theatersoft.pack
                ? execo(`cd ${DEPLOY}; npm pack ${path}`)
                : require(`${path}/package.json`).version,
            server = {
                "@theatersoft/server": pack(find('@theatersoft/server')),
                "@theatersoft/bus": pack(find('@theatersoft/bus'))
            },
            client = {
                "@theatersoft/client": pack(find('@theatersoft/client'))
            }
        hosts.forEach(({name, services = []}) => {
            hostPackage(name, services.reduce(
                (o, {module}) =>
                    (o[module] = pack(find(module)), o),
                Object.assign({}, server, isRoot(name) && client)
            ))
            hostEnv(name)
            hostSystem(name)
        })

        Object.assign(sitePkg.scripts, hosts.reduce((o, {name: host}) => {
            o[`deploy-${host}`] = `npm run HOME -- deploy -- -- ${host}`
            o[`journal-${host}`] = `${isRoot(host) ? '' : `ssh ${host}.local `}journalctl -u theatersoft -f --no-tail`
            o[`restart-${host}`] = `${isRoot(host) ? '' : `ssh ${host}.local `}sudo systemctl restart theatersoft`
            o[`stop-${host}`] = `${isRoot(host) ? '' : `ssh ${host}.local `}sudo systemctl stop theatersoft`
            return o
        }, {}))
        writeJson(PACKAGE, sitePkg)
    },

    async deploy (host) {
        if (!host) {
            for (const {name} of hosts) await targets.deploy(name)
            return
        }
        if (Array.isArray(host)) host = host[0]
        log(`\ntarget deploy ${host}\n`)
        const
            capture = exists(`${DEPLOY}/${host}/theatersoft-capture.service`),
            tars = Object.values(require(`${DEPLOY}/${host}/package.json`).dependencies).filter(s => s.endsWith('.tgz')).map(s => `${DEPLOY}/${s}`).join(' ')
        if (isRoot(host)) {
            // mkdir DEST
            if (!exists('/opt/theatersoft'))
                await execa(`sudo mkdir -p ${DEST}; sudo chown $USER ${DEST}; mkdir -p ${DEST}/.config/theatersoft`)
            // authbind
            if (!exists('/etc/authbind/byport/443'))
                await execa(`sudo apt-get -q install authbind; sudo install -o $USER -m 755 /dev/null /etc/authbind/byport/443; sudo install -o $USER -m 755 /dev/null /etc/authbind/byport/80`)
            // Install packages
            exec(`rm -f ${DEST}/*.tgz`)
            exec(`cp -v ${tars} ${DEPLOY}/${host}/package.json COPYRIGHT LICENSE ${DEST}`)
            log(`\nstart npm install`)
            await execa(`cd ${DEST}; npm install`)
            log(`done npm install\n`)
            // Bus env
            exec(`cp -v ${DEPLOY}/${host}/.bus ${DEPLOY}/${host}/.root ${DEST}/.config/theatersoft`)
            // Symlink config.json
            exec(`ln -sfvt ${DEST}/.config/theatersoft \$(pwd)/config.json`)
            // System services
            log(`\nstart service install`)
            await execa(`sudo cp -v ${DEPLOY}/${host}/*.service /etc/systemd/system/`)
            await execa('sudo systemctl daemon-reload')
            await execa('sudo systemctl enable theatersoft; sudo systemctl start theatersoft')
            capture && await execa('sudo systemctl enable theatersoft-capture; sudo systemctl start theatersoft-capture')
            log(`done service install\n`)
            await execa('systemctl status theatersoft')
        } else {
            const
                ssh = c => exec(`ssh ${host}.local "${c}"`),
                scp = (s, d = '') => exec(`scp ${s} ${host}.local:${d}`),
                sscp = (s, d) => exec(`cat ${s} | ssh ${host}.local "sudo tee ${d} > /dev/null"`)
            // mkdir DEST
            ssh(`sudo mkdir -p ${DEST}`)
            ssh(`sudo chown $USER ${DEST}`)
            ssh(`mkdir -p ${DEST}/.config/theatersoft`)
            // Install packages
            ssh(`rm -f ${DEST}/*.tgz`)
            scp(`${tars} ${DEPLOY}/${host}/package.json COPYRIGHT LICENSE`, DEST)
            log(`start npm install`)
            ssh(`cd ${DEST}; npm install`)
            log(`done npm install\n`)
            // Bus env
            scp(`${DEPLOY}/${host}/.bus`, `${DEST}/.config/theatersoft`)
            // System services
            log(`\nstart service install`)
            sscp(`${DEPLOY}/${host}/theatersoft.service`, `/etc/systemd/system/theatersoft.service`)
            capture && sscp(`${DEPLOY}/${host}/theatersoft-capture.service`, `/etc/systemd/system/theatersoft-capture.service`)
            ssh('sudo systemctl daemon-reload')
            ssh('sudo systemctl enable theatersoft; sudo systemctl start theatersoft')
            capture && ssh('sudo systemctl enable theatersoft-capture; sudo systemctl start theatersoft-capture')
            log(`done service install\n`)
            ssh('systemctl status theatersoft')
        }
    }
}
Object.assign(target, targets)
