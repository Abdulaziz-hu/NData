---
title: N(DATA) v1.11.0 Released
date: 2026-05-10
author: N(DATA) Team
category: news
slug: v1-11-0-released
lang: en
---

# N(DATA) v1.11.0 Released

We are happy to share that version 1.11.0 of N(DATA) is now live.

## What is New

This release adds a large set of features based on community feedback. Here is a quick summary of the main changes:

**Bookmarks** - You can now save any item using the bookmark button on each card or inside the product modal. Your bookmarks are saved locally in your browser and persist across sessions.

**Compare** - Select up to 4 items and compare their specs side by side in a clean table view. Use the bar-chart icon on any card to add it to the compare list.

**Sort by Price and Date** - The filter bar now includes quick-sort buttons for price (low to high, high to low) and date added (newest, oldest).

**Card Image Previews** - Product cards now show images when available. A halftone dot pattern overlays the image by default, and it fades out when you hover. If a product has multiple images, they scroll automatically while you hover the card.

**Copy Specs** - Each card has a small copy button that grabs the full spec list as plain text. Useful for quick comparisons or pasting into a document.

**Keyboard Shortcut** - Press the / key anywhere on the page to jump to the search bar.

**Multi-language Support** - The interface now supports English, Arabic, Japanese, and German. Use the globe icon in the nav bar to switch. Translation files live under /lang/.

**More Currencies** - EUR and GBP have been added to the currency selector alongside USD, SAR, and JPY.

**More Categories** - Gaming, Monitors, and Networking have been added as new category filters.

**Auto ID Assignment** - Items without an explicit ID in the data file are now assigned one automatically in the format prefix-NNNNNN (for example phn-000042). This means IDs no longer need to be managed manually in the JSON.

**Full Docs Page** - The /api/docs page is now fully written with the data schema, code examples, and a changelog.

**Live API Explorer** - The /api/api page now has a working query explorer where you can filter, search, sort, and download results without writing any code.

**Icon Fixes** - The burger menu, theme toggle, and other icons no longer disappear or change unexpectedly after re-renders. Theme icons now use a dedicated data-theme-icon attribute and update correctly.

## How to Update

If you are self-hosting, pull the latest files from the GitHub repository and replace the static assets. No database changes are needed.

## Contributing

If you would like to add items to the archive, fix a spec, or report an issue, please use the report page or open a pull request on GitHub.
