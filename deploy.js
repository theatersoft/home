'use strict'
require('shelljs/make')
const
    DEST = '/opt/theatersoft',
    fs = require('fs'),
    pkg = require('./package.json'),
    cfg = require('./config.json'),
    {hosts = []} = cfg,
    hostname = require('os').hostname(),
    execo = c => exec(c, {silent: true}).stdout.trim(),
    write = (file, json) => fs.writeFileSync(file, JSON.stringify(json, null, '  '), 'utf-8'),
    log = console.log

const targets = {
    config () {
        log('target config')
        exec(`mkdir -p deploy`)
        const
            find = module => execo(`${module === '@theatersoft/server' ? ''
                : 'npm explore @theatersoft/server '}npm explore ${module} pwd`),
            pack = path => execo(`cd deploy; npm pack ${path}`),
            baseDependencies = {
                "@theatersoft/client": pack(find('@theatersoft/client')),
                "@theatersoft/server": pack(find('@theatersoft/server')),
                "@theatersoft/bus": pack(find('@theatersoft/bus'))
            }
        log('Base dependencies:\n')
        log(baseDependencies)
        log('\nService dependencies:')
        hosts.forEach(({name, services = []}) => {
            log(`\n${name}`)
            targets.package(name, services.reduce((o, {module}) => {
                const path = find(module)
                log('└──', module)
                o[module] = pack(path)
                log('    ', path, '\n    ...', o[module])
                return o
            }, Object.assign({}, baseDependencies)))
        })
        Object.assign(pkg.scripts, hosts.reduce((o, {name}) => {
            o[`deploy-${name}`] = `node deploy deploy -- ${name}`
            o[`deploy-link-${name}`] = `node deploy link -- ${name}`
            return o
        }, {}))
        write('package.json', pkg)
    },

    package (host, dependencies) {
        exec(`mkdir -p deploy/${host}`)
        write(`deploy/${host}/package.json`, Object.assign({}, pkg, {
            dependencies,
            devDependencies: undefined,
            scripts: pkg.deployScripts,
            deployScripts: undefined
        }))
    },

    deploy (host) {
        if (!host) return hosts.forEach(({name}) => targets.deploy(name))
        if (Array.isArray(host)) host = host[0]
        log('target deploy', host)
        if (host === hostname) {
            exec(`mkdir -p ${DEST}`)
            exec(`cp deploy/*.tgz deploy/${host}/package.json COPYRIGHT LICENSE ${DEST}`)
            exec(`cd ${DEST}; npm install`)
        } else {
            const
                ssh = c => exec(`ssh ${host}.local "${c}"`),
                scp = (s, d) => exec(`scp ${s} ${host}.local:${d || ''}`)
            ssh(`mkdir -p ${DEST}`)
            scp(`deploy/*.tgz deploy/${host}/package.json COPYRIGHT LICENSE`, DEST)
            ssh(`cd ${DEST}; npm install`)
        }
    },

    link (host) {
        if (Array.isArray(host)) host = host[0]
        log('target link', host)
        const modules = Object.keys(require(`./deploy/${host}/package.json`).dependencies)
        if (host === hostname) {
            for (const mod of modules)
                exec(`cd ${DEST}; npm link ${mod}`)
        } else {
            const
                ssh = c => exec(`ssh ${host}.local "${c}"`)
            for (const mod of modules)
                ssh(`cd ${DEST}; npm link ${mod}`)
        }
    }
}
Object.assign(target, targets)