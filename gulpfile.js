//-------------------------
// variable setting
//-------------------------

var gulp        = require('gulp'),
	data        = require('gulp-data'),
	fs          = require('fs'),
	sequence    = require('run-sequence'),
	changed     = require('gulp-changed'),
	cache       = require('gulp-cached'),
	plumber     = require('gulp-plumber'),
	notify      = require('gulp-notify'),
	browserSync = require('browser-sync'),
	jade        = require('gulp-jade'),
	extender    = require('gulp-html-extend'),
	prettify    = require('gulp-prettify'),
	please      = require('gulp-pleeease'),
	sass        = require('gulp-ruby-sass'),
	cmq         = require('gulp-combine-media-queries'),
	uglify      = require('gulp-uglify'),
	sprite      = require('gulp.spritesmith'),
	imagemin    = require('gulp-imagemin'),
	pngquant    = require('imagemin-pngquant'),
	bower       = require('main-bower-files'),
	concat      = require('gulp-concat'),
	filter      = require('gulp-filter'),
	del = require('del');

var PLEASE_BROWSERS = [
		'last 2 versions',
		'ie >= 8'
	];

var JADE_DEV_GLOB     = 'dev/jade/**/*.jade',
	JADE_DIST_DIR     = 'dev/extend/',
	EXTEND_DEV_GLOB   = 'dev/extend/output/**/*.html',
	EXTEND_DIST_DIR   = 'dist/',
	SCSS_DEV_DIR      = 'dev/scss',
	SCSS_DIST_DIR     = 'dist/css/',
	JSCONCAT_DEV_GLOB   = 'dev/js/**/*.js',
	JSCONCAT_DIST_DIR = 'dev/js/',
	JSUGLIFY_DIST_DIR   = 'dist/js/',
	SPRITE_DEV_GLOB   = 'dev/sprite/*.png',
	IMAGEMIN_DEV_GLOB = 'dev/img/**/*.+(jpg|jpeg|png|gif|svg)',
	IMAGEMIN_DIST_DIR = 'dist/img/';

//-------------------------
// jade
//-------------------------

gulp.task('jade', function(){
	return gulp.src(JADE_DEV_GLOB)
		.pipe(changed(JADE_DIST_DIR, {extension: ['.html','.json']}))
		.pipe(plumber({errorHandler: notify.onError('<%= error.message %>')}))
		.pipe(jade({
			doctype: 'html', //on = not xhtml
			data: JSON.parse(fs.readFileSync('./dev/jade/data/config.json'))
		}))
		.pipe(prettify({
			// indent_size: 1,
			// indent_char: ' ',
			eol : '\r\n',
			indent_with_tabs: true
		}))
		.pipe(gulp.dest(JADE_DIST_DIR));
});

//-------------------------
// extender
//-------------------------

gulp.task('extend', function(){
	return gulp.src(EXTEND_DEV_GLOB)
		.pipe(changed(EXTEND_DIST_DIR, {extension: ['.html']}))
		.pipe(plumber({errorHandler: notify.onError('<%= error.message %>')}))
		.pipe(extender({root:'./dev/extend/',annotations: false}))
		.pipe(prettify({
			// indent_size: 1,
			// indent_char: ' ',
			eol : '\r\n',
			indent_with_tabs: true
		}))
		.pipe(gulp.dest(EXTEND_DIST_DIR))
		.pipe(browserSync.reload({stream: true}));
});

//-------------------------
// scss
//-------------------------

gulp.task('scss',function(){
	return sass(SCSS_DEV_DIR,{style : 'expanded'})
		.pipe(cache('scss'))
		.pipe(plumber({errorHandler: notify.onError('<%= error.message %>')}))
		.pipe(cmq({log: true}))
		.pipe(please({
			// "minifier": false,
			'autoprefixer': {
				browesers: PLEASE_BROWSERS
			}
		}))
		.pipe(gulp.dest(SCSS_DIST_DIR))
		.pipe(browserSync.reload({stream: true}));
});

//-------------------------
// bower js
//-------------------------

gulp.task('bowerjs', function() {
	var jsFilter,jsglob,minjsglob = [];
	jsFilter = filter('**/*.js');
	jsglob = bower({checkExistence:true});
	for (var i = 0, len = jsglob.length; i < len; i++) {
		var filename = jsglob[i].replace('.js','.min.js');
		minjsglob.push(filename);
	}
	return gulp.src(minjsglob)
		.pipe(jsFilter)
		.pipe(concat('lib.js'))
		.pipe(gulp.dest(JSUGLIFY_DIST_DIR));
});

//-------------------------
// compile js
//-------------------------

gulp.task('concat', function(){
	return gulp.src(JSCONCAT_DEV_GLOB)
		.pipe(plumber({errorHandler: notify.onError('<%= error.message %>')}))
		.pipe(concat('config.js'))
		.pipe(uglify({
			preserveComments: 'some'
		}))
		.pipe(gulp.dest('dist/js/'))
		.pipe(browserSync.reload({stream: true}));
});

//-------------------------
// sprite generate
//-------------------------

gulp.task('sprite', function(){
	var spriteData = gulp.src(SPRITE_DEV_GLOB)
		.pipe(sprite({
			imgName: 'sprite.png',
			imgPath: '../img/sprite.png',
			cssName: '_sprite.scss',
			padding: 5
		}));
	spriteData.img
		.pipe(imagemin({
			use:[pngquant({
				quality: 60-80,
				speed: 1
			})]
		}))
		.pipe(gulp.dest(IMAGEMIN_DIST_DIR));
	spriteData.css
		.pipe(gulp.dest(SCSS_DIST_DIR));
	return spriteData;
});

//-------------------------
// compression image
//-------------------------

gulp.task('imagemin', function(){
	return gulp.src(IMAGEMIN_DEV_GLOB)
		.pipe(changed(IMAGEMIN_DIST_DIR))
		.pipe(imagemin({
			progressive: true,
			interlaced: true,
			multipass: true,
			optimizationLevel: 4
			// use: [pngquant({
			// 	quality: 70-80,
			// 	speed: 1
			// })]
		}))
		.pipe(gulp.dest(IMAGEMIN_DIST_DIR));
});

//-------------------------
// clean
//-------------------------

gulp.task('clean', function(cb){
	del(['dist/js/**.js','!dist/js/config.js','!dist/js/lib.js']);
});

//-------------------------
// server
//-------------------------

gulp.task('browser-sync', function(){
	browserSync({
		port: 3000,
		server: {
			baseDir: 'dist'
		}
	});
});

//-------------------------
// build
//-------------------------

gulp.task('build', function(callback){
	return sequence(
		'sprite',
		'jade',
		['concat','bowerjs','extend','scss'],
		'imagemin',
		callback
	);
});

//-------------------------
// watch
//-------------------------

gulp.task('watch', ['build'], function(){
	gulp.watch(['dev/sprite/**'], ['sprite']);
	gulp.watch(['dev/img/**'], ['imagemin']);
	gulp.watch(['dev/scss/**'], ['scss']);
	gulp.watch(['dev/jade/**'], ['jade']);
	gulp.watch(['dev/extend/**'], ['extend']);
	gulp.watch(['dev/js/**'], ['concat']);
});

//-------------------------
// default
//-------------------------

gulp.task('default', ['browser-sync', 'watch']);
