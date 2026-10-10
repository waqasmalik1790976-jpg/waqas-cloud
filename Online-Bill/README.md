# Payment Slip Maker

Single-page web app for making and copying payment slips.

- Click any value on the slip to edit it.
- Amount (P/W x Rate) and Total Payable Balance are calculated automatically.
- **Copy slip** copies the slip as an image (with background) to the clipboard, ready to paste into WhatsApp. If the browser blocks image copy, it copies the slip as text.
- **Duplicate** makes a copy of a slip below it. **Delete** removes a slip.
- Values are saved in the browser (localStorage).

No build step and no dependencies: just `index.html`.

## Run locally

Open `index.html` in a browser.

## Publish on GitHub Pages

1. Create a new repository on GitHub and upload the files from this folder.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and the `/ (root)` folder, then **Save**.
4. After a minute your app will be live at `https://<your-username>.github.io/<repository-name>/`.

Note: copying images to the clipboard needs a secure page (HTTPS), which GitHub Pages provides.
