const UglifyJSPlugin = require( 'uglifyjs-webpack-plugin' );
const webpack = require( 'webpack' );

module.exports = {
	entry : './app.js',
	output : {
		filename : './app.min.js'
	},
	module : {
		rules : [
			{
				test : /\.js$/,
				use : {
					loader : 'babel-loader',
					options : {
						presets : [ 'es2015' ],
					},
				},
			},
		],
	},
	plugins : [
		new UglifyJSPlugin()
	],
}
