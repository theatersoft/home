'use strict'
require('shelljs/make')

const
    //path = require('path'),
    fs = require('fs'),
    pkg = require('./package.json'),
    DEST = '/opt/theatersoft'

const targets = {
    opt () {
        exec(`mkdir -p ${DEST}`)
        exec(`cp client/theatersoft-*.tgz server/theatersoft-*.tgz ${DEST}`)
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
        fs.writeFileSync(`${DEST}/package.json`, JSON.stringify(p, null, '  '), 'utf-8')
    },

    npmi () {
        exec(`cd ${DEST}; for i in *.tgz; do npm install $i; done`)
    },

    all () {
        targets.opt()
        targets.package()
        targets.npmi()
    }
}

Object.assign(target, targets)