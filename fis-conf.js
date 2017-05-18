fis.match('*.{js,es,es6,jsx,ts,tsx}', {
    preprocessor: [
        fis.plugin('js-require-css', {
            mode: 'inline'
        })
    ]
});

fis.match('**.less', {
    rExt: '.css', // from .less to .css
    parser: fis.plugin('less-2.x'), // less路径均用绝对路径
    postprocessor: fis.plugin('postcss', {
        sourceMap: false
    }),
    useSprite: true
});

var package = require('./package.json');
var name = package.name;
var version = package.version;

// 整个项目配置命名空间+模块名+版本信息
var urlPrefix = '/shared/component/' + name + '/' + version;

// 引用模块配置命名空间+模块名，根据引入资源版本确定版本，而无需放到引用中
var modulePrefix = 'component/' + name;

// npm install [-g] fis3-hook-commonjs
fis.hook('commonjs');

fis.match('**', {
    release: urlPrefix + '$0'
});

fis.match('{mocha/**, fis-conf.js, jsdoc.json, package.json, README.md}', {
    release: false
});

fis.match('(lib/**).js', {
    isMod: true,
    moduleId: modulePrefix + '/$1'
});

fis.match('::package', {
    postpackager: fis.plugin('loader', {
        resourceType: 'commonJs'
    })
});

['test', 'prod'].map(function(env) {

    fis.media(env).match('**', {
        domain: 'http://c1024.yunkai.com',
        useCache: false
    });

    // packTo
    var packTo = name + '.' + env + '.js';
    fis.media(env).match('(lib/**).js', {
        parser: fis.plugin('es6-babel'),
        packTo: packTo,
        optimizer: fis.plugin('uglify-js'),
        deploy: false
    });

    fis.media(env).match(packTo, {
        deploy: fis.plugin('local-deliver')
    });

    fis.media(env).match('{jsdoc/**, demo/**, demo.html}', {
        deploy: fis.plugin('local-deliver')
    });

});