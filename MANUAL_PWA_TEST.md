# Omarko PWA Manual Test Checklist

Test the installable PWA and mobile experience at https://omarko.vercel.app

## Android Chrome

1. Open https://omarko.vercel.app in Chrome
2. Menu (⋮) → **Add to Home screen** or **Install app**
3. Confirm the install dialog (name: "Omarko")
4. Open the app from the home screen
5. **Verify**: App opens in standalone mode (no browser URL bar)
6. **Verify**: Navigation works (Feed, Bookmarks, Create, Profile)
7. **Verify**: Sign in / Sign up works
8. **Verify**: Create, vote, comment flows work

## iPhone Safari

1. Open https://omarko.vercel.app in Safari
2. Tap Share button (↑)
3. Tap **Add to Home Screen**
4. Edit name if needed (default: "Omarko") → Add
5. Open the app from the home screen
6. **Verify**: App opens in standalone mode (full screen, no Safari UI)
7. **Verify**: Navigation works
8. **Verify**: Sign in works (Safari WebView auth flow)
9. **Verify**: Core features (create, vote, comment) work

## General Checks

- [ ] App icon appears correctly on home screen
- [ ] Splash screen shows (if supported)
- [ ] Status bar / notch area uses theme color
- [ ] Touch targets feel comfortable (44px min)
- [ ] No duplicate "Feed" header on home page
- [ ] Time displays as relative (e.g. 5m, 3h, Feb 23)

## Troubleshooting

- **Icon not updating**: Clear cache or re-add to home screen
- **Auth issues on iOS**: Ensure third-party cookies / ITP allows the domain
- **Standalone not full screen**: Check manifest `display: "standalone"` and apple meta tags
