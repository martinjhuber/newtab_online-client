const { src, dest, series, parallel } = require('gulp');
const del = require('del');
const rename = require('gulp-rename');
const terser = require('gulp-terser-js');   // uglify js

const BUILD_DIR = "./build";

const clean = function() {
    return del(BUILD_DIR);
}

const html = function() {
    return src('./src/*.*').pipe(dest(BUILD_DIR));
}

const css = function() {
    return src('./src/css/*').pipe(dest(BUILD_DIR+"/css"));
}

const js = function() {
    return src('./src/js/*.js').pipe(terser()).pipe(dest(BUILD_DIR+"/js"));
}

const configDev = function() {
    return src('./src/js/config/config-development.js')
        .pipe(rename('config.js'))
        .pipe(dest(BUILD_DIR+"/js/config"));
}

const configProd = function() {
    return src('./src/js/config/config-production.js')
        .pipe(rename('config.js'))
        .pipe(dest(BUILD_DIR+"/js/config"));
}

const build = series(clean, html, parallel(css, js));

exports.clean = clean;
exports.buildDev = series(build, configDev);
exports.buildProd = series(build, configProd);
exports.build = exports.buildDev;
