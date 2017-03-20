'use strict'
require('shelljs/make')
const
    DEST = '/opt/theatersoft',
    fs = require('fs'),
    pkg = require('./package.json'),
    hostname = require('os').hostname(),
    isRoot = host => host === hostname,
    execo = c => exec(c, {silent: true}).stdout.trim(),
    write = (file, json) => fs.writeFileSync(file, JSON.stringify(json, null, '  '), 'utf-8'),
    log = console.log

try {fs.accessSync('config.json')}
catch (e) {
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
        })

        Object.assign(pkg.scripts, hosts.reduce((o, {name}) => {
            o[`deploy-${name}`] = `node deploy deploy -- ${name}`
            return o
        }, {}))
        write('package.json', pkg)
    },

    package (host, dependencies) {
        log(dependencies)
        exec(`mkdir -p deploy/${host}`)
        const link = Object.keys(dependencies).map(d => `npm link ${d}`).join('; ')
        const start = `${pkg.deployScripts.start}${isRoot(host) ? '' : '-child'}`
        write(`deploy/${host}/package.json`, Object.assign({}, pkg, {
            dependencies,
            devDependencies: undefined,
            scripts: Object.assign({}, pkg.deployScripts, {link}, {start}),
            deployScripts: undefined,
            theatersoft: undefined
        }))
    },

    deploy (host) {
        if (!host) return hosts.forEach(({name}) => targets.deploy(name))
        if (Array.isArray(host)) host = host[0]
        log('target deploy', host)
        if (isRoot(host)) {
            exec(`cp -v $(ls deploy/*.tgz) deploy/${host}/package.json COPYRIGHT LICENSE ${DEST}`)
            log(`start npm install`)
            exec(`cd ${DEST}; npm install`)
            log(`done npm install`)
        } else {
            const
                ssh = c => exec(`ssh ${host}.local "${c}"`),
                scp = (s, d) => exec(`scp ${s} ${host}.local:${d || ''}`)
            ssh(`sudo mkdir -p ${DEST}`)
            ssh(`sudo chown $USER ${DEST}`)
            scp(`deploy/*.tgz deploy/${host}/package.json COPYRIGHT LICENSE`, DEST)
            log(`start npm install`)
            ssh(`cd ${DEST}; npm install`)
            log(`done npm install`)
        }
    }
}
Object.assign(target, targets)
