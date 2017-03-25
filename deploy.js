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
    {hosts = []} = cfg

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

        Object.assign(pkg.scripts, hosts.reduce((o, {name}) =>
            (o[`deploy-${name}`] = `node deploy deploy -- ${name}`, o), {})
        )
        writeJson('package.json', pkg)
    },

    deploy (host) {
        if (!host) return hosts.forEach(({name}) => targets.deploy(name))
        if (Array.isArray(host)) host = host[0]
        log('target deploy', host)
        if (isRoot(host)) {
            // Install packages
            exec(`cp -v $(ls deploy/*.tgz) deploy/${host}/package.json COPYRIGHT LICENSE ${DEST}`)
            log(`start npm install`)
            exec(`cd ${DEST}; npm install`)
            log(`done npm install`)
            // Bus env
            exec(`cp -v deploy/${host}/.bus deploy/${host}/.root ${DEST}/.config/theatersoft`)
            // Symlink config.json
            exec(`ln -sfvt ${DEST}/.config/theatersoft \$(pwd)/config.json`)
            // System services
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
            scp(`$(ls deploy/*.tgz) deploy/${host}/package.json COPYRIGHT LICENSE`, DEST)
            log(`start npm install`)
            ssh(`cd ${DEST}; npm install`)
            log(`done npm install`)
            // Bus env
            scp(`deploy/${host}/.bus`, `${DEST}/.config/theatersoft`)
            // System services
            const capture = exists(`deploy/${host}/theatersoft-capture.service`)
            sscp(`deploy/${host}/theatersoft.service`, `/usr/lib/systemd/system/theatersoft.service`)
            capture && sscp(`deploy/${host}/theatersoft-capture.service`, `/usr/lib/systemd/system/theatersoft-capture.service`)
            ssh('sudo systemctl daemon-reload')
            ssh('sudo systemctl enable theatersoft')
            capture && ssh('sudo systemctl enable theatersoft-capture')
        }
    }
}
Object.assign(target, targets)
