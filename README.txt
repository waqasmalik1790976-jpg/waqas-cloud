PAYMENT SLIP WEB APP - GITHUB PAGES

Files:
- index.html            Main payment slip app
- manifest.webmanifest  Web-app/PWA settings
- sw.js                 Service worker
- .nojekyll             GitHub Pages helper

GITHUB PAGES SETUP (BEGINNER)
1. Create a new GitHub repository, for example: payment-slip.
2. Upload ALL files from this folder into the repository root.
3. GitHub -> Settings -> Pages.
4. Under Build and deployment, choose "Deploy from a branch".
5. Select Branch: main and Folder: / (root), then Save.
6. Wait for GitHub Pages to publish the HTTPS website.
7. Open the HTTPS link in Chrome and bookmark it.

The app saves slip data in the browser's localStorage. No database is required.
For Copy Slip, open WhatsApp Web and use Ctrl+V after copying the slip image.
