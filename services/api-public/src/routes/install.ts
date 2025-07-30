import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';

const installRoutes = new Hono();

// Serve the interactive configuration script
installRoutes.get('/', async (c) => {
  try {
    // Read the configure.sh script from file
    const scriptPath = path.join(__dirname, '../scripts/configure.sh');
    const configureScript = fs.readFileSync(scriptPath, 'utf8');
    
    // Return the script with proper headers
    c.header('Content-Type', 'text/plain; charset=utf-8');
    return c.text(configureScript);
  } catch (error) {
    console.error('Failed to read configure script:', error);
    // Fallback to redirecting to GitHub
    return c.redirect('https://raw.githubusercontent.com/m00npl/guardant-worker/main/configure.sh');
  }
});

// Legacy redirects
installRoutes.get('/install-worker.sh', async (c) => {
  return c.redirect('/install');
});

installRoutes.get('/worker.sh', async (c) => {
  return c.redirect('/install');
});

export { installRoutes };