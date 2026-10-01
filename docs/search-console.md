# Google Search Console setup

LyricFlow emits a Google site verification meta tag when the public build-time
variable `VITE_GOOGLE_SITE_VERIFICATION` is set. The value is the verification
token from Google's HTML tag method, without the surrounding HTML.

1. Add `lyricflow-swastik.lovable.app` to Google Search Console as a URL-prefix
   property and choose the HTML tag verification method.
2. Copy only the tag's `content` value into the Lovable project environment as
   `VITE_GOOGLE_SITE_VERIFICATION`.
3. Redeploy the app so the tag is present in the rendered document head, then
   return to Search Console and select **Verify**.
4. After verification, open **Sitemaps** and submit
   `https://lyricflow-swastik.lovable.app/sitemap.xml`.

The verification token is public by design; it only proves control of the
property. Do not put an API key or other secret in this variable.

The sitemap includes only the public homepage and romanized-lyrics guide. The
Library contains browser-linked user data and remains `noindex`; upload and
player flows also remain out of search results.
