const gulp = require('gulp')
const pug = require('gulp-pug')

const sass = require('gulp-sass')
const rename = require('gulp-rename')
const sourcemaps = require('gulp-sourcemaps')
const StyleLint = require('gulp-stylelint')
const plumber = require('gulp-plumber')
const sassGlob = require('gulp-sass-glob')

const del = require('del')

const browserSync = require('browser-sync').create()

const gulpWebpack = require('gulp-webpack')
const webpack = require('webpack')
const webpackConfig = require('./webpack.config.js')
const eslint = require('gulp-eslint')
const babel = require('gulp-babel')

const imagemin = require('gulp-imagemin')

const ghPages = require('gulp-gh-pages')

//svg
const cheerio = require('gulp-cheerio') //jquery для , парсить страницу
const replace = require('gulp-replace')
const svgSprite = require('gulp-svg-sprite') // создает спрайты
const svgmin = require('gulp-svgmin') // оптимизация спрайтов

const config = {
  mode: {
    symbol: {
      sprite: '../sprite.svg',
      example: {
        dest: '../spriteSvgDemo.html' // демо html
      }
    }
  }
}

const paths = {
  root: './build',
  // templates: {
  //     pages: 'src/templates/pages/*.pug',
  //     src: 'src/templates/**/*.pug',
  // },
  // htmls: {
  //     src: 'src/templates/**/*.html',
  //     dest: 'build/',
  // },
  htmls: {
    src: 'src/templates/**/*.html'
    // dest: 'build/'
  },
  styles: {
    src: 'src/styles/**/*.scss',
    dest: 'build/assets/styles/'
  },
  images: {
    src: 'src/images/**/*.*',
    dest: 'build/assets/images/'
  },
  scripts: {
    src: 'src/scripts/**/*.js',
    dest: 'build/assets/scripts/'
  },
  fonts: {
    src: 'src/fonts/**/*.*',
    dest: 'build/assets/fonts/'
  }
}

// pug
// function templates() {
//     return gulp.src(paths.templates.pages)
//         .pipe(pug({ pretty: true }))
//         .pipe(gulp.dest(paths.root));
// }

// scss
function styles() {
  return gulp
    .src('./src/styles/app.scss')
    .pipe(plumber())
    .pipe(
      StyleLint({
        reporters: [{ formatter: 'string', console: true, fix: true }]
      })
    )
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(sourcemaps.write())
    .pipe(rename({ suffix: '.min' }))
    .pipe(sassGlob())
    .pipe(gulp.dest(paths.styles.dest))
}

// очистка
function clean() {
  return del(paths.root)
}

// галповский вотчер
function watch() {
  gulp.watch(paths.styles.src, styles)
  gulp.watch(paths.htmls.src, htmls)
  gulp.watch(paths.images.src, images)
  gulp.watch(paths.scripts.src, scripts)
  gulp.watch(paths.fonts.src, fonts)
}

// локальный сервер + livereload (встроенный)
function server() {
  browserSync.init({
    server: paths.root
  })
  browserSync.watch(paths.root + '/**/*.*', browserSync.reload)
}

// просто переносим картинки
function images() {
  return gulp
    .src(paths.images.src)
    .pipe(
      imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.jpegtran({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [{ removeViewBox: true }, { cleanupIDs: false }]
        })
      ])
    )
    .pipe(gulp.dest(paths.images.dest))
}

// webpack
function scripts() {
  return (
    gulp
      .src('src/scripts/app.js')
      .pipe(plumber())
      .pipe(eslint({ fix: true }))
      .pipe(eslint.format())
      // .pipe(babel({ presets: ['@babel/env']} ))
      .pipe(gulpWebpack(webpackConfig, webpack))
      .pipe(gulp.dest(paths.scripts.dest))
  )
}

//svg
gulp.task('sprite', function() {
  return (
    gulp
      .src('src/icons/*.svg')
      // минифицируем svg
      .pipe(
        svgmin({
          js2svg: {
            pretty: true
          }
        })
      )
      // удалить все атрибуты fill, style and stroke в фигурах
      .pipe(
        cheerio({
          run: function($) {
            $('[fill]').removeAttr('fill')
            $('[stroke]').removeAttr('stroke')
            $('[style]').removeAttr('style')
          },
          parserOptions: {
            xmlMode: true
          }
        })
      )
      // cheerio плагин заменит, если появилась, скобка '&gt;', на нормальную.
      .pipe(replace('&gt;', '>'))
      // build svg sprite
      .pipe(svgSprite(config))
      .pipe(gulp.dest('src/images/'))
  )
})

//ghPages
gulp.task('deploy', function() {
  return gulp.src('./build/**/*').pipe(ghPages())
})

function fonts() {
  return gulp.src(paths.fonts.src).pipe(gulp.dest(paths.fonts.dest))
}
function htmls() {
  return gulp
    .src(paths.htmls.src)
    .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))
    .pipe(gulp.dest(paths.root))
}

exports.htmls = htmls
// exports.templates = templates;
exports.styles = styles
exports.clean = clean
exports.images = images
exports.fonts = fonts

gulp.task(
  'default',
  gulp.series(
    clean,
    gulp.parallel(htmls, styles, images, scripts, fonts),
    gulp.parallel(watch, server)
  )
)
