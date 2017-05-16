var gulp = require('gulp');
var aglio = require('gulp-aglio');

gulp.task('docs', function () {
    gulp.src('./blueprints/**/*.md')
        .pipe(aglio({
            themeVariables: 'streak',
            themeTemplate: 'triple'
        }))
        .on('error', function (err) { console.log('Error : ' + err.message); })
        .pipe(gulp.dest('./docs'))
});

gulp.task('watch', function () {
    gulp.watch(['./blueprints/**/*.md'], ['docs']);
});

gulp.task('default', ['docs', 'watch']);
