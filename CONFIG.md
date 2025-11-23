Configuration — Form delivery

You can enable real delivery for the `Service Request` form in two ways:

1) Formspree (no server)
   - Sign up at https://formspree.io and create a form.
   - Copy the form endpoint (e.g. `https://formspree.io/f/yourid`).
   - Open `js/app.js` and set the variable `FORMSPREE_ENDPOINT` to that URL.

2) Custom API endpoint
   - Implement a server endpoint that accepts POST JSON payload, e.g.: { name, email, service, message, lang }
   - Make sure your endpoint accepts CORS from your site or runs on the same origin.
   - Set `CUSTOM_API_ENDPOINT` in `js/app.js` to the POST URL.

Behavior in the code
- If `FORMSPREE_ENDPOINT` is set, the script posts the `FormData` directly to Formspree.
- If `CUSTOM_API_ENDPOINT` is set, the script sends JSON to your endpoint.
- If neither is set, the form submission remains demo-only (alerts only).

Notes
- For Formspree, set the Accept header to `application/json` and the script handles success/failure.
- For production, prefer a server-side endpoint that can send email (to avoid exposing keys) or use a transactional email provider.

Security
- Don't commit secret API keys into the repo. Keep server-side secrets on your server.

If you want, I can configure a sample Formspree endpoint for you (you'll need to create the form on Formspree and paste the endpoint), or scaffold a tiny server (Node/Express) to accept requests and forward emails (requires providing SMTP/API credentials).