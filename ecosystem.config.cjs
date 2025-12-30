/**
 * PM2 Ecosystem Configuration for hadoku-printTool
 *
 * Manages the local PrintTool server with ImageMagick processing.
 * The Cloudflare Tunnel is managed separately by hadoku_site.
 *
 * Usage:
 *   pnpm local:start   # Start the server
 *   pnpm local:stop    # Stop the server
 *   pnpm local:restart # Restart the server
 *   pnpm local:logs    # View logs
 *   pnpm local:status  # Check status
 *
 * First-time setup:
 *   npm install -g pm2
 *   cd server && npm install
 */

module.exports = {
	apps: [
		{
			name: 'printtool-server',
			cwd: './server',
			script: 'src/index.ts',
			interpreter: './node_modules/.bin/tsx',
			watch: ['src'],
			ignore_watch: ['node_modules'],
			autorestart: true,
			max_restarts: 5,
			env: {
				PORT: 8787,
			},
		},
	],
};
