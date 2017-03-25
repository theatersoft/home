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
    exists = f => {try {fs.accessSync(f); return true} catch (e) {return false}}

if (!exists('config.json')) {
    log('Creating config.json')
    exec(`sed 's/{{HOSTNAME}}/${hostname}/' config.json.template > config.json`)
}

const
    cfg = require('./config.json'),
    {hosts = []} = cfg

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
            log(`\n${name}`)

            targets.package(name, services.reduce((o, {module}) => {
                const path = find(module)
                o[module] = pack(path)
                return o
            }, Object.assign({}, server, isRoot(name) && client)))

            targets.env(name)
        })

        Object.assign(pkg.scripts, hosts.reduce((o, {name}) => {
            o[`deploy-${name}`] = `node deploy deploy -- ${name}`
            return o
        }, {}))
        writeJson('package.json', pkg)
    },

    package (host, dependencies) {
        log(dependencies)
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
    },

    env (host) {
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
    },

    deploy (host) {
        if (!host) return hosts.forEach(({name}) => targets.deploy(name))
        if (Array.isArray(host)) host = host[0]
        log('target deploy', host)
        if (isRoot(host)) {
            // Install packages
            exec(`cp -v $(ls deploy/*.tgz) deploy/${host}/package.json COPYRIGHT LICENSE ${DEST}`)
            exec(`cp -v deploy/${host}/.bus deploy/${host}/.root ${DEST}/.config/theatersoft`)
            log(`start npm install`)
            exec(`cd ${DEST}; npm install`)
            log(`done npm install`)

            // Symlink config.json
            exec(`ln -sfvt ${DEST}/.config/theatersoft \$(pwd)/config.json`)

            // Create server TLS certificate
        } else {
            const
                ssh = c => exec(`ssh ${host}.local "${c}"`),
                scp = (s, d) => exec(`scp ${s} ${host}.local:${d || ''}`)
            ssh(`sudo mkdir -p ${DEST}`)
            ssh(`sudo chown $USER ${DEST}`)
            scp(`$(ls deploy/*.tgz) deploy/${host}/package.json COPYRIGHT LICENSE`, DEST)
            scp(`deploy/${host}/.bus`, `${DEST}/.config/theatersoft`)
            log(`start npm install`)
            ssh(`cd ${DEST}; npm install`)
            log(`done npm install`)
        }
    }
}
Object.assign(target, targets)
