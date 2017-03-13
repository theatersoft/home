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
            find = module => execo(`cd server; npm explore ${module} pwd`),
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
        Object.assign(pkg.scripts, hosts.reduce((o, {name}) =>
            ((o[`deploy-${name}`] = `node deploy deploy -- ${name}`), o), {}))
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
        log('target host', host)
        if (host === hostname) {
            exec(`mkdir -p ${DEST}`)
            exec(`cp deploy/*.tgz deploy/${host}/package.json ${DEST}`)
            exec(`cd ${DEST}; npm install`)
        } else {
            log('TODO')
        }
    }
}
Object.assign(target, targets)