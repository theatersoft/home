'use strict'
require('shelljs/make')
const
    DEST = '/opt/theatersoft',
    DEST_CONFIG_THEATERSOFT = `${DEST}/.config/theatersoft`,
    fs = require('fs'),
    pkg = require('./package.json'),
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
    cfg = (!exists('config.json') && exec(`sed 's/{{HOSTNAME}}/${hostname}/' config.json.template > config.json`), require('./config.json')),
    {hosts = []} = cfg,
    execa = c => new Promise(r => exec(c, (code, stdout, stderr) => r()))

function hostPackage (host, dependencies) {
    log(`${host}\n`, dependencies)
    exec(`mkdir -p deploy/${host}`)
    const link = Object.keys(dependencies).map(d => `npm link ${d}`).join('; ')
    const start = `${pkg.deployScripts.start}${isRoot(host) ? '' : '-child'}`
    writeJson(`deploy/${host}/package.json`, Object.assign({}, pkg, {
        dependencies,
        devDependencies: undefined,
        scripts: Object.assign({}, pkg.deployScripts, {link}, {start}),
        deployScripts: undefined,
        theatersoft: undefined
    }))
}

function hostEnv (host) {
    if (exists(`deploy/${host}/.bus`)) return
    // Create bus env
    process.env.XDG_CONFIG_HOME = `${DEST}/.config`
    const
        {createSession} = require('@theatersoft/server'),
        auth = createSession(host, undefined, '@theatersoft/home')
    if (host === hostname) {
        write(`deploy/${host}/.root`, `PORT=443\n`)
        write(`deploy/${host}/.bus`, `BUS=wss://localhost\nAUTH=${auth}\n`)
    } else {
        write(`deploy/${host}/.bus`, `BUS=wss://${hostname}.local\nAUTH=${auth}\n`)
    }
}

function hostSystem (host) {
    const
        root = host === hostname,
        {cameras} = hosts.find(({name}) => name === host),
        BUS = root ? '.root' : '.bus',
        AUTHBIND = root ? '/usr/bin/authbind ' : ''
    exec(`sed -e "s/{{USER}}/$USER/" -e 's/{{BUS}}/${BUS}/' -e 's|{{AUTHBIND}}|${AUTHBIND}|' system/theatersoft.service.template > deploy/${host}/theatersoft.service`)
    cameras && exec(`sed "s/{{USER}}/$USER/" system/theatersoft-capture.service.template > deploy/${host}/theatersoft-capture.service`)
}

const targets = {
    config () {
        log('target config')
        exec(`mkdir -p deploy`)
        const
            find = module => execo(`${module === '@theatersoft/server' ? ''
                : 'npm explore @theatersoft/server '}npm explore ${module} pwd`),
            pack = path => pkg.theatersoft.pack
                ? execo(`cd deploy; npm pack ${path}`)
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

        Object.assign(pkg.scripts, hosts.reduce((o, {name}) => {
            o[`deploy-${name}`] = `node deploy deploy -- ${name}`
            o[`journal-${name}`] = `node deploy journal -- ${name}`
            o[`restart-${name}`] = `node deploy restart -- ${name}`
            return o
        }, {}))
        writeJson('package.json', pkg)
    },

    async deploy (host) {
        if (!host) return hosts.forEach(({name}) => targets.deploy(name))
        if (Array.isArray(host)) host = host[0]
        log('target deploy', host)
        const
            capture = exists(`deploy/${host}/theatersoft-capture.service`),
            tars = Object.values(require(`./deploy/${host}/package.json`).dependencies).filter(s => s.endsWith('.tgz')).map(s => `deploy/${s}`).join(' ')
        if (isRoot(host)) {
            // mkdir DEST
            if (!exists('/opt/theatersoft'))
                await execa(`sudo mkdir -p ${DEST}; sudo chown $USER ${DEST}; mkdir -p ${DEST}/.config/theatersoft`)
            // authbind
            if (!exists('/etc/authbind/byport/443'))
                await execa(`sudo apt-get -q install authbind; sudo install -o $USER -m 755 /dev/null /etc/authbind/byport/443; sudo install -o $USER -m 755 /dev/null /etc/authbind/byport/80`)
            // Install packages
            exec(`rm ${DEST}/*.tgz`)
            exec(`cp -v ${tars} deploy/${host}/package.json COPYRIGHT LICENSE ${DEST}`)
            log(`\nstart npm install`)
            await execa(`cd ${DEST}; npm install`)
            log(`done npm install\n`)
            // Bus env
            exec(`cp -v deploy/${host}/.bus deploy/${host}/.root ${DEST}/.config/theatersoft`)
            // Symlink config.json
            exec(`ln -sfvt ${DEST}/.config/theatersoft \$(pwd)/config.json`)
            // System services
            log(`\nstart service install`)
            await execa(`sudo cp -v deploy/${host}/*.service /etc/systemd/system/`)
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
            ssh(`rm ${DEST}/*.tgz`)
            scp(`${tars} deploy/${host}/package.json COPYRIGHT LICENSE`, DEST)
            log(`start npm install`)
            ssh(`cd ${DEST}; npm install`)
            log(`done npm install\n`)
            // Bus env
            scp(`deploy/${host}/.bus`, `${DEST}/.config/theatersoft`)
            // System services
            log(`\nstart service install`)
            sscp(`deploy/${host}/theatersoft.service`, `/etc/systemd/system/theatersoft.service`)
            capture && sscp(`deploy/${host}/theatersoft-capture.service`, `/etc/systemd/system/theatersoft-capture.service`)
            ssh('sudo systemctl daemon-reload')
            ssh('sudo systemctl enable theatersoft; sudo systemctl start theatersoft')
            capture && ssh('sudo systemctl enable theatersoft-capture; sudo systemctl start theatersoft-capture')
            log(`done service install\n`)
            ssh('systemctl status theatersoft')
        }
    },

    async journal (host) {
        if (Array.isArray(host)) host = host[0]
        log('target journal', host)
        const
            ssh = c => exec(`ssh ${host}.local "${c}"`)
        if (isRoot(host))
            exec('journalctl -u theatersoft -f --no-tail')
        else
            ssh('journalctl -u theatersoft -f --no-tail')
    },

    async restart (host) {
        if (Array.isArray(host)) host = host[0]
        log('target restart', host)
        const
            ssh = c => exec(`ssh ${host}.local "${c}"`)
        if (isRoot(host))
            await execa('sudo systemctl restart theatersoft')
        else
            ssh('sudo systemctl restart theatersoft')
    }
}
Object.assign(target, targets)
