var gulp = require('gulp');
var aglio = require('gulp-aglio');

gulp.task('docs', function () {
    gulp.src('./blueprints/**/*.md')
        .pipe(aglio({
            filterInput: true, // Filter \r and \t from the input
            theme: 'default', // Theme name to load for rendering
            themeVariables: 'streak', // Built-in color scheme or path to LESS or CSS
            themeCondenseNav: true, // Condense single-action navigation links
            themeFullWidth: true, // Use the full page width
            themeTemplate: 'triple', // Layout name or path to custom layout file
            themeStyle: 'default' // Built-in style name or path to LESS or CSS
        }))
        .on('error', function (err) { console.log('Error : ' + err.message); })
        .pipe(gulp.dest('./docs'))
});

gulp.task('watch', function () {
    gulp.watch(['./blueprints/**/*.md'], ['docs']);
});

gulp.task('default', ['docs', 'watch']);
