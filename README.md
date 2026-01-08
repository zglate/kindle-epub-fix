# Kindle EPUB Fix (Enhanced Fork)

Amazon Send-to-Kindle service accepts EPUB files, but is strict about validation and encoding. This tool fixes common issues that cause E999 and E21018 errors.

**Use it now:** https://deploy-preview-25--kindle-epub-fix.netlify.app/

## What This Tool Fixes

- **Encoding:** Adds UTF-8 declaration if missing
- **E21018 errors:** Removes empty `alt=""` attributes and `data-AmznRemoved` attributes
- **Hyperlinks:** Fixes NCX table of contents links to `<body>` with ID hash
- **Language:** Detects invalid/missing language tags, prompts for correction
- **Stray images:** Removes `<img>` tags with no source
- **Unique identifier:** Fixes mismatch between OPF package and dc:identifier
- **NCX playOrder:** Ensures sequential numbering
- **Smart quotes:** Normalizes unicode quotes/dashes in NCX navigation to ASCII
- **EPUB3 attributes:** Removes `epub:type`, `epub:prefix`, `xmlns:epub` (not supported by older Kindle)
- **Bold/Italic tags:** Converts `<b>`, `<strong>`, `<i>`, `<em>` to CSS-styled `<span>` elements
- **Scripts:** Removes `<script>` tags
- **OPF metadata:** Cleans up `primary-writing-mode` and other problematic metadata

## Privacy

The book is processed entirely in your browser. Nothing is uploaded.

## Debugging Tip

If your EPUB still fails after processing, use [Kindle Previewer](https://www.amazon.com/Kindle-Previewer/b?node=21381691011) to open it. It shows detailed error codes (like E21018) that help identify remaining issues.

## Warning

This tool comes with no warranty. Please keep your original EPUB. We do not guarantee the resulting file will be valid, but it should work with Send to Kindle.

---

*Enhanced fork of [innocenat/kindle-epub-fix](https://github.com/innocenat/kindle-epub-fix)*
