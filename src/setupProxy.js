const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const target = process.env.REACT_APP_API_BASE || 'http://localhost:4000/api';
  if (target.includes('localhost')) {
    // Only proxy in local dev
    app.use(
      '/api',
      createProxyMiddleware({
        target: target.replace('/api', ''),
        changeOrigin: true,
      })
    );
  }
};
