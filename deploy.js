'use strict'
require('shelljs/make')

const
//path = require('path'),
    fs = require('fs'),
    pkg = require('./package.json'),
    cfg = require('./config.json'),
    DEST = '/opt/theatersoft',
    execo = c => exec(c, {silent: true}).stdout.trim()

const targets = {
    opt () {
        exec(`mkdir -p ${DEST}`)
        exec(`cp client/theatersoft-*.tgz server/theatersoft-*.tgz ${DEST}`)
    },

    pack () {
        const {hosts = []} = cfg
        exec(`mkdir -p deploy`)
        hosts.forEach(({name, services = []}) => {
            console.log(`\n${name}`)
            services.forEach(({module}) => {
                const path = execo(`cd server; npm explore ${module} pwd`)
                console.log('└──', module)
                console.log('    ', path)
                const file = execo(`cd ${path}; npm pack`)
                exec(`cd deploy; mv ${path}/${file} .`)
            })
        })
    },

    package () {
        const p = Object.assign({}, pkg, {
            dependencies: {
                "@theatersoft/client": "~1",
                "@theatersoft/server": "~3"
            },
            devDependencies: undefined,
            scripts: undefined
        })
        fs.writeFileSync(
            `${DEST}/package.json`
            , JSON.stringify(p, null, '  '), 'utf-8')
    },

    npmi () {
        exec(
            `cd ${DEST}; for i in *.tgz; do npm install $i; done`
        )
    },

    all () {
        targets.opt()
        targets.pack()
        //targets.package()
        //targets.npmi()
    }
}

Object.assign(target, targets)