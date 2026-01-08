const TXT_PROCESSING = 'Processing...'
const TXT_DONE = 'Finished processing all files.'
const TXT_NO_ERROR = 'No errors detected. Perhaps there are other errors?<br>Output file is available for download anyway.'
const TXT_SYS_ERROR = 'The program encountered an internal error.'

// Unicode to ASCII transliteration map for NCX/metadata
const UNICODE_MAP = {
  '\u201c': '"',  // left double quotation mark
  '\u201d': '"',  // right double quotation mark
  '\u2018': "'",  // left single quotation mark
  '\u2019': "'",  // right single quotation mark (apostrophe)
  '\u201a': "'",  // single low-9 quotation mark
  '\u201b': "'",  // single high-reversed-9 quotation mark
  '\u201e': '"',  // double low-9 quotation mark
  '\u201f': '"',  // double high-reversed-9 quotation mark
  '\u2013': '-',  // en dash
  '\u2014': '--', // em dash
  '\u2015': '--', // horizontal bar
  '\u2026': '...', // ellipsis
  '\u00a0': ' ',  // non-breaking space
  '\u2002': ' ',  // en space
  '\u2003': ' ',  // em space
  '\u2009': ' ',  // thin space
  '\u00ab': '"',  // left-pointing double angle quotation mark
  '\u00bb': '"',  // right-pointing double angle quotation mark
  '\u2039': "'",  // single left-pointing angle quotation mark
  '\u203a': "'",  // single right-pointing angle quotation mark
}

const mainStatusDiv = document.getElementById('main_status')
const outputDiv = document.getElementById('output')
const btnDlAll = document.getElementById('btnDlAll')
const keepOriginalFilename = document.getElementById('keepOriginalFilename')

const filePicker = document.getElementById('file')

let filenames = [], fixedBlobs = [], dlfilenames = []

function build_output_html(idx, status) {
  const statusDiv = document.createElement('div')
  const dlBtn = document.createElement('button')
  statusDiv.style.margin = '1em 0'
  dlBtn.style.margin = '1em 0'
  dlBtn.innerHTML = 'Download'
  dlBtn.addEventListener('click', () => {
    saveAs(fixedBlobs[idx], dlfilenames[idx])
  })

  let btn = false

  if (status === TXT_NO_ERROR) {
    statusDiv.innerHTML = status
    statusDiv.style.color = 'blue'
    btn = true
  } else if (status === TXT_SYS_ERROR) {
    statusDiv.innerHTML = status
    statusDiv.style.color = 'red'
    btn = false
  } else {
    statusDiv.innerHTML = `<ul class="scroll">${status.map(x => `<li>${x}</li>`).join('')}</ul>`
    statusDiv.style.color = 'green'
    btn = 'block'
  }

  const section = document.createElement('section')
  section.style.margin = '2em 0'
  section.innerHTML = `<h3>${filenames[idx]}</h3>`
  section.appendChild(statusDiv)
  if (btn) {
    section.appendChild(dlBtn)
  }

  return section
}

function setMainStatus(type) {
  if (type === '') {
    mainStatusDiv.style.display = 'none'
    mainStatusDiv.style.display = 'none'
  } else {
    mainStatusDiv.style.display = 'block'
    if (type === TXT_PROCESSING) {
      mainStatusDiv.innerHTML = type
      mainStatusDiv.style.color = 'blue'
    } else if (type === TXT_DONE) {
      mainStatusDiv.innerHTML = type
      mainStatusDiv.style.color = 'blue'
    }
  }
}

function basename(path) {
  return path.split('/').pop()
}

function simplify_language(lang) {
  return lang.split('-').shift().toLowerCase()
}

class EPUBBook {
  fixedProblems = []

  // Add UTF-8 encoding declaration if missing
  fixEncoding() {
    const encoding = '<?xml version="1.0" encoding="utf-8"?>'
    const regex = /^<\?xml\s+version=["'][\d.]+["']\s+encoding=["'][a-zA-Z\d-.]+["'].*?\?>/i

    for (const filename in this.files) {
      const ext = filename.split('.').pop()
      if (ext === 'html' || ext === 'xhtml') {
        let html = this.files[filename]
        html = html.trimStart()
        if (!regex.test(html)) {
          html = encoding + '\n' + html
          this.fixedProblems.push(`Fixed encoding for file ${filename}`)
        }
        this.files[filename] = html
      }
    }
  }

  // Fix linking to body ID showing up as unresolved hyperlink
  fixBodyIdLink() {
    const bodyIDList = []
    const parser = new DOMParser()

    // Create list of ID tag of <body>
    for (const filename in this.files) {
      const ext = filename.split('.').pop()
      if (ext === 'html' || ext === 'xhtml') {
        let html = this.files[filename]
        const dom = parser.parseFromString(html, 'text/html')
        const bodyID = dom.getElementsByTagName('body')[0].id
        if (bodyID.length > 0) {
          const linkTarget = basename(filename) + '#' + bodyID
          bodyIDList.push([linkTarget, basename(filename)])
        }
      }
    }

    // Replace all
    for (const filename in this.files) {
      for (const [src, target] of bodyIDList) {
        if (this.files[filename].includes(src)) {
          this.files[filename] = this.files[filename].replaceAll(src, target)
          this.fixedProblems.push(`Replaced link target ${src} with ${target} in file ${filename}.`)
        }
      }
    }
  }

  // Fix language field not defined or not available
  fixBookLanguage() {
    const parser = new DOMParser()

    // From https://kdp.amazon.com/en_US/help/topic/G200673300
    // Retrieved: 2022-Sep-13
    const allowed_languages = [
      // ISO 639-1
      'af', 'gsw', 'ar', 'eu', 'nb', 'br', 'ca', 'zh', 'kw', 'co', 'da', 'nl', 'stq', 'en', 'fi', 'fr', 'fy', 'gl',
      'de', 'gu', 'hi', 'is', 'ga', 'it', 'ja', 'lb', 'mr', 'ml', 'gv', 'frr', 'nb', 'nn', 'pl', 'pt', 'oc', 'rm',
      'sco', 'gd', 'es', 'sv', 'ta', 'cy',

      // ISO 639-2
      'afr', 'ara', 'eus', 'baq', 'nob', 'bre', 'cat', 'zho', 'chi', 'cor', 'cos', 'dan', 'nld', 'dut', 'eng', 'fin',
      'fra', 'fre', 'fry', 'glg', 'deu', 'ger', 'guj', 'hin', 'isl', 'ice', 'gle', 'ita', 'jpn', 'ltz', 'mar', 'mal',
      'glv', 'nor', 'nno', 'por', 'oci', 'roh', 'gla', 'spa', 'swe', 'tam', 'cym', 'wel',
    ]

    // Find OPF file
    if (!('META-INF/container.xml' in this.files)) {
      console.error('Cannot find META-INF/container.xml')
      return
    }
    const meta_inf_str = this.files['META-INF/container.xml']
    const meta_inf = parser.parseFromString(meta_inf_str, 'text/xml')
    let opf_filename = ''
    for (const rootfile of meta_inf.getElementsByTagName('rootfile')) {
      if (rootfile.getAttribute('media-type') === 'application/oebps-package+xml') {
        opf_filename = rootfile.getAttribute('full-path')
      }
    }

    // Read OPF file
    if (!(opf_filename in this.files)) {
      console.error('Cannot find OPF file!')
      return
    }

    const opf_str = this.files[opf_filename]
    try {
      const opf = parser.parseFromString(opf_str, 'text/xml')
      const language_tags = opf.getElementsByTagName('dc:language')
      let language = 'en'
      let original_language = 'undefined'
      if (language_tags.length === 0) {
        language = prompt('E-book does not have language tag. Please specify the language of the book in RFC 5646 format, e.g. en, fr, ja.', 'en') || 'en'
      } else {
        language = language_tags[0].innerHTML
        original_language = language
      }
      if (!allowed_languages.includes(simplify_language(language))) {
        language = prompt(`Language ${language} is not supported by Kindle. Documents may fail to convert. Continue or specify new language of the book in RFC 5646 format, e.g. en, fr, ja.`, language) || language
      }
      if (language_tags.length === 0) {
        const language_tag = opf.createElement('dc:language')
        language_tag.innerHTML = language
        opf.getElementsByTagName('metadata')[0].appendChild(language_tag)
      } else {
        language_tags[0].innerHTML = language
      }
      if (language !== original_language) {
        this.files[opf_filename] = new XMLSerializer().serializeToString(opf)
        this.fixedProblems.push(`Change document language from ${original_language} to ${language}.`)
      }
    } catch (e) {
      console.error(e)
      console.error('Error trying to parse OPF file as XML.')
    }
  }

  fixStrayIMG() {
    const parser = new DOMParser()

    for (const filename in this.files) {
      const ext = filename.split('.').pop()
      if (ext === 'html' || ext === 'xhtml') {
        let html = parser.parseFromString(this.files[filename], ext === 'xhtml' ? 'application/xhtml+xml' : 'text/html')
        let strayImg = []
        for (const img of html.getElementsByTagName('img')) {
          if (!img.getAttribute('src')) {
            strayImg.push(img)
          }
        }
        if (strayImg.length > 0) {
          for (const img of strayImg) {
            img.parentElement.removeChild(img)
          }
          this.fixedProblems.push(`Remove stray image tag(s) in ${filename}`)
          this.files[filename] = new XMLSerializer().serializeToString(html)
        }
      }
    }
  }

  // Get the OPF filename from container.xml
  getOPFFilename() {
    if (!('META-INF/container.xml' in this.files)) {
      return null
    }
    const parser = new DOMParser()
    const container = parser.parseFromString(this.files['META-INF/container.xml'], 'application/xml')
    for (const rootfile of container.getElementsByTagName('rootfile')) {
      if (rootfile.getAttribute('media-type') === 'application/oebps-package+xml') {
        return rootfile.getAttribute('full-path')
      }
    }
    return null
  }

  // Ensure package@unique-identifier matches a dc:identifier id
  fixUniqueIdentifier() {
    const opfFilename = this.getOPFFilename()
    if (!opfFilename || !(opfFilename in this.files)) {
      console.error('Cannot find OPF file')
      return
    }

    const parser = new DOMParser()
    const opf = parser.parseFromString(this.files[opfFilename], 'application/xml')

    // Check for parse error
    if (opf.querySelector('parsererror')) {
      console.error('OPF parse error')
      return
    }

    const pkg = opf.documentElement
    if (pkg.tagName !== 'package') {
      console.error('OPF root is not <package>')
      return
    }

    let uniqueIdAttr = pkg.getAttribute('unique-identifier')
    const DC_NS = 'http://purl.org/dc/elements/1.1/'
    const identifiers = opf.getElementsByTagNameNS(DC_NS, 'identifier')

    if (identifiers.length === 0) {
      // No dc:identifier at all - create one
      const metadata = opf.getElementsByTagName('metadata')[0]
      if (metadata) {
        const newId = opf.createElementNS(DC_NS, 'dc:identifier')
        const idValue = uniqueIdAttr || 'BookId'
        newId.setAttribute('id', idValue)
        newId.textContent = 'urn:uuid:' + crypto.randomUUID()
        metadata.appendChild(newId)
        if (!uniqueIdAttr) {
          pkg.setAttribute('unique-identifier', idValue)
        }
        this.files[opfFilename] = new XMLSerializer().serializeToString(opf)
        this.fixedProblems.push('Created missing dc:identifier')
      }
      return
    }

    // Check if unique-identifier matches any dc:identifier id
    let matchFound = false
    for (const id of identifiers) {
      if (id.getAttribute('id') === uniqueIdAttr) {
        matchFound = true
        break
      }
    }

    if (!matchFound) {
      // No match - fix it
      const firstId = identifiers[0]
      const existingIdAttr = firstId.getAttribute('id')

      if (existingIdAttr) {
        // Update package to point to existing identifier
        pkg.setAttribute('unique-identifier', existingIdAttr)
        this.fixedProblems.push(`Fixed unique-identifier to match "${existingIdAttr}"`)
      } else {
        // Add id to first identifier
        const newIdAttr = uniqueIdAttr || 'BookId'
        firstId.setAttribute('id', newIdAttr)
        if (!uniqueIdAttr) {
          pkg.setAttribute('unique-identifier', newIdAttr)
        }
        this.fixedProblems.push('Added id attribute to dc:identifier')
      }
      this.files[opfFilename] = new XMLSerializer().serializeToString(opf)
    }
  }

  // Find the NCX filename from the OPF manifest
  getNCXFilename() {
    const opfFilename = this.getOPFFilename()
    if (!opfFilename || !(opfFilename in this.files)) {
      return null
    }

    const parser = new DOMParser()
    const opf = parser.parseFromString(this.files[opfFilename], 'application/xml')

    // Look for NCX in manifest
    const manifestItems = opf.getElementsByTagName('item')
    for (const item of manifestItems) {
      const mediaType = item.getAttribute('media-type')
      const href = item.getAttribute('href')
      if (mediaType === 'application/x-dtbncx+xml' && href) {
        // Resolve relative to OPF location
        const opfDir = opfFilename.includes('/') ? opfFilename.substring(0, opfFilename.lastIndexOf('/') + 1) : ''
        return opfDir + href
      }
    }

    // Fallback: look for .ncx file directly
    for (const filename in this.files) {
      if (filename.endsWith('.ncx')) {
        return filename
      }
    }

    return null
  }

  // Fix NCX playOrder to be sequential
  fixNCXPlayOrder() {
    const ncxFilename = this.getNCXFilename()
    if (!ncxFilename || !(ncxFilename in this.files)) {
      // No NCX file - EPUB3 might only have nav.xhtml
      return
    }

    const parser = new DOMParser()
    const ncx = parser.parseFromString(this.files[ncxFilename], 'application/xml')

    // Check for parse error
    if (ncx.querySelector('parsererror')) {
      console.error('NCX parse error')
      return
    }

    // Get all navPoints in document order
    const navPoints = ncx.getElementsByTagName('navPoint')
    if (navPoints.length === 0) {
      return
    }

    // Check if playOrder needs fixing
    let needsFix = false
    let expectedOrder = 1
    for (const np of navPoints) {
      const currentOrder = parseInt(np.getAttribute('playOrder'), 10)
      if (isNaN(currentOrder) || currentOrder !== expectedOrder) {
        needsFix = true
        break
      }
      expectedOrder++
    }

    if (needsFix) {
      // Renumber all playOrder attributes sequentially
      let order = 1
      for (const np of navPoints) {
        np.setAttribute('playOrder', order++)
      }
      this.files[ncxFilename] = new XMLSerializer().serializeToString(ncx)
      this.fixedProblems.push('Fixed NCX playOrder sequence')
    }
  }

  // Helper to transliterate unicode to ASCII
  transliterateUnicode(text) {
    let result = text
    for (const [unicode, ascii] of Object.entries(UNICODE_MAP)) {
      result = result.split(unicode).join(ascii)
    }
    return result
  }

  // Normalize unicode in NCX navLabel text
  normalizeNCXUnicode() {
    const ncxFilename = this.getNCXFilename()
    if (!ncxFilename || !(ncxFilename in this.files)) {
      return
    }

    const parser = new DOMParser()
    const ncx = parser.parseFromString(this.files[ncxFilename], 'application/xml')

    if (ncx.querySelector('parsererror')) {
      return
    }

    let modified = false

    // Find all text elements within navLabel
    const textElements = ncx.getElementsByTagName('text')
    for (const textEl of textElements) {
      const original = textEl.textContent
      const normalized = this.transliterateUnicode(original)
      if (normalized !== original) {
        textEl.textContent = normalized
        modified = true
      }
    }

    // Also normalize docTitle
    const docTitles = ncx.getElementsByTagName('docTitle')
    for (const dt of docTitles) {
      const textEls = dt.getElementsByTagName('text')
      for (const textEl of textEls) {
        const original = textEl.textContent
        const normalized = this.transliterateUnicode(original)
        if (normalized !== original) {
          textEl.textContent = normalized
          modified = true
        }
      }
    }

    if (modified) {
      this.files[ncxFilename] = new XMLSerializer().serializeToString(ncx)
      this.fixedProblems.push('Normalized unicode characters in NCX')
    }
  }

  // Apply fixes to HTML/XHTML files using regex to preserve original structure
  // Only falls back to DOM parsing for malformed files
  reserializeHTML() {
    const parser = new DOMParser()

    for (const filename in this.files) {
      const ext = filename.split('.').pop().toLowerCase()
      if (!['html', 'xhtml', 'htm'].includes(ext)) {
        continue
      }

      let content = this.files[filename]
      let modified = false
      let fixes = []

      // Try parsing as XHTML to check if well-formed
      const strictDoc = parser.parseFromString(content, 'application/xhtml+xml')
      const isMalformed = !!strictDoc.querySelector('parsererror')

      if (isMalformed) {
        // Malformed - need DOM round-trip via HTML5 parser
        const xmlDeclMatch = content.match(/^(\s*<\?xml[^?]*\?>\s*)/i)
        const xmlDecl = xmlDeclMatch ? xmlDeclMatch[1] : ''
        let contentForParsing = content.replace(/^\s*<\?xml[^?]*\?>\s*/i, '')
        contentForParsing = contentForParsing.replace(/^\s*<!DOCTYPE[^>]*>\s*/i, '')

        const doc = parser.parseFromString(contentForParsing, 'text/html')

        // Apply all fixes to the parsed DOM
        this.applyDOMFixes(doc, fixes)

        // Serialize and restore XML declaration
        content = new XMLSerializer().serializeToString(doc)
        fixes.push(`Fixed malformed markup in ${filename}`)
        modified = true
      } else {
        // Well-formed XHTML - use regex-based fixes to preserve structure
        const originalContent = content

        // Remove epub: namespace declaration from html tag
        content = content.replace(/\s+xmlns:epub="[^"]*"/gi, '')

        // Remove epub:type attributes
        content = content.replace(/\s+epub:type="[^"]*"/gi, '')

        // Remove epub:prefix attributes
        content = content.replace(/\s+epub:prefix="[^"]*"/gi, '')

        // Remove xml:lang from html tag
        content = content.replace(/(<html[^>]*)\s+xml:lang="[^"]*"/gi, '$1')

        // Remove lang from html tag
        content = content.replace(/(<html[^>]*)\s+lang="[^"]*"/gi, '$1')

        // Remove role attributes
        content = content.replace(/\s+role="[^"]*"/gi, '')

        // Remove body ID attributes with UUID-style hashes (long IDs 20+ chars with dashes)
        // Preserves legitimate short IDs like "chapter-1"
        content = content.replace(/(<body[^>]*)\s+id="[a-zA-Z0-9]+-[a-zA-Z0-9-]{15,}"/gi, '$1')

        // Convert <b> to <span class="...bold"> preserving existing classes
        // Use negative lookahead to avoid matching <body, <br, etc.
        content = content.replace(/<b(?![a-z])(\s+class="([^"]*)")?([^>]*)>([\s\S]*?)<\/b>/gi, (match, classAttr, existingClass, rest, inner) => {
          const classes = existingClass ? existingClass + ' bold' : 'bold'
          return `<span class="${classes}"${rest}>${inner}</span>`
        })

        // Convert <strong> to <span class="...bold">
        content = content.replace(/<strong(\s+class="([^"]*)")?([^>]*)>([\s\S]*?)<\/strong>/gi, (match, classAttr, existingClass, rest, inner) => {
          const classes = existingClass ? existingClass + ' bold' : 'bold'
          return `<span class="${classes}"${rest}>${inner}</span>`
        })

        // Convert <i> to <span class="...italic">
        // Use negative lookahead to avoid matching <img, <input, etc.
        content = content.replace(/<i(?![a-z])(\s+class="([^"]*)")?([^>]*)>([\s\S]*?)<\/i>/gi, (match, classAttr, existingClass, rest, inner) => {
          const classes = existingClass ? existingClass + ' italic' : 'italic'
          return `<span class="${classes}"${rest}>${inner}</span>`
        })

        // Convert <em> to <span class="...italic">
        content = content.replace(/<em(?![a-z])(\s+class="([^"]*)")?([^>]*)>([\s\S]*?)<\/em>/gi, (match, classAttr, existingClass, rest, inner) => {
          const classes = existingClass ? existingClass + ' italic' : 'italic'
          return `<span class="${classes}"${rest}>${inner}</span>`
        })

        // Remove script tags
        const scriptMatches = content.match(/<script[\s\S]*?<\/script>/gi)
        if (scriptMatches) {
          content = content.replace(/<script[\s\S]*?<\/script>/gi, '')
          fixes.push(`Removed ${scriptMatches.length} <script> tag(s) from ${filename}`)
        }

        // Remove stray img tags (no src)
        content = content.replace(/<img(?![^>]*\ssrc=)[^>]*\/?>/gi, '')

        // Remove empty alt attributes (alt="" causes Kindle E21018 error)
        // Calibre removes these entirely
        content = content.replace(/\s*alt=""\s*/gi, ' ')

        // Remove data-AmznRemoved attributes (cause parsing errors)
        content = content.replace(/\s*data-AmznRemoved[^=]*="[^"]*"/gi, '')

        if (content !== originalContent) {
          modified = true
          // Count what we fixed
          if (originalContent.includes('epub:')) fixes.push(`Removed epub: attributes from ${filename}`)
          if (originalContent.includes('xml:lang=') || /\slang="/.test(originalContent)) fixes.push(`Removed lang attributes from ${filename}`)
          if (originalContent.includes('role="')) fixes.push(`Removed role attributes from ${filename}`)
          if (/<b[\s>]/i.test(originalContent) || /<strong[\s>]/i.test(originalContent) ||
              /<i[\s>]/i.test(originalContent) || /<em[\s>]/i.test(originalContent)) {
            fixes.push(`Converted <b>/<i> tags to <span> in ${filename}`)
          }
        }
      }

      if (modified) {
        this.files[filename] = content
        fixes.forEach(f => {
          if (!this.fixedProblems.includes(f)) this.fixedProblems.push(f)
        })
      }
    }
  }

  // Helper: apply fixes to a parsed DOM (used for malformed files)
  applyDOMFixes(doc, fixes) {
    // Strip scripts
    const scripts = doc.querySelectorAll('script')
    scripts.forEach(el => el.remove())

    // Remove stray images
    const strayImages = doc.querySelectorAll('img:not([src]), img[src=""]')
    strayImages.forEach(el => el.remove())

    // Remove empty alt attributes (causes E21018)
    doc.querySelectorAll('img[alt=""]').forEach(el => el.removeAttribute('alt'))

    // Remove data-AmznRemoved attributes (causes kindlegen rejection)
    doc.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.toLowerCase().startsWith('data-amznremoved')) {
          el.removeAttribute(attr.name)
        }
      })
    })

    // Remove epub: attributes
    doc.querySelectorAll('*').forEach(el => {
      ['epub:type', 'epub:prefix', 'xmlns:epub'].forEach(attr => {
        if (el.hasAttribute(attr)) el.removeAttribute(attr)
      })
    })

    // Convert b/i/strong/em to span
    const tagMap = { 'B': 'bold', 'STRONG': 'bold', 'I': 'italic', 'EM': 'italic' }
    for (const [tagName, className] of Object.entries(tagMap)) {
      Array.from(doc.getElementsByTagName(tagName)).forEach(el => {
        const span = doc.createElement('span')
        const classes = el.className ? el.className + ' ' + className : className
        span.className = classes
        span.innerHTML = el.innerHTML
        el.parentNode.replaceChild(span, el)
      })
    }

    // Remove body ID with UUID-style hashes (20+ chars)
    const body = doc.querySelector('body')
    if (body && body.id && body.id.includes('-') && body.id.length > 20) {
      body.removeAttribute('id')
    }

    // Remove role attributes
    doc.querySelectorAll('[role]').forEach(el => el.removeAttribute('role'))

    // Remove lang attributes
    const html = doc.querySelector('html')
    if (html) {
      html.removeAttribute('xml:lang')
      html.removeAttribute('lang')
    }
  }

  // Clean up OPF metadata - remove problematic elements
  cleanOPFMetadata() {
    const opfFilename = this.getOPFFilename()
    if (!opfFilename || !(opfFilename in this.files)) {
      return
    }

    const parser = new DOMParser()
    const opf = parser.parseFromString(this.files[opfFilename], 'application/xml')

    if (opf.querySelector('parsererror')) {
      return
    }

    let modified = false

    // Remove primary-writing-mode meta (Amazon doesn't need it)
    const metas = opf.querySelectorAll('meta[name="primary-writing-mode"], meta[content="horizontal-lr"], meta[content="vertical-rl"]')
    metas.forEach(meta => {
      if (meta.getAttribute('name') === 'primary-writing-mode' ||
          meta.getAttribute('content') === 'horizontal-lr' ||
          meta.getAttribute('content') === 'vertical-rl') {
        meta.remove()
        modified = true
      }
    })

    if (modified) {
      this.files[opfFilename] = new XMLSerializer().serializeToString(opf)
      this.fixedProblems.push('Removed primary-writing-mode from OPF')
    }
  }

  // Add CSS rules for bold/italic spans if not present
  addBoldItalicCSS() {
    const cssRules = `
/* Added by Kindle EPUB Fix for bold/italic span support */
.bold { font-weight: bold; }
.italic { font-style: italic; }
`
    // Find CSS files and check if rules already exist
    for (const filename in this.files) {
      if (filename.endsWith('.css')) {
        const content = this.files[filename]
        if (!content.includes('.bold') && !content.includes('.italic')) {
          this.files[filename] = content + cssRules
          this.fixedProblems.push(`Added .bold/.italic CSS rules to ${filename}`)
          return // Only add to first CSS file
        }
      }
    }
  }

  async readEPUB(blob) {
    const reader = new zip.ZipReader(new zip.BlobReader(blob))
    this.entries = await reader.getEntries()
    this.files = {}
    this.binary_files = {}
    for (const entry of this.entries) {
      const filename = entry.filename
      const ext = filename.split('.').pop()
      if (filename === 'mimetype' || ['html', 'xhtml', 'htm', 'xml', 'svg', 'css', 'opf', 'ncx'].includes(ext)) {
        this.files[filename] = await entry.getData(new zip.TextWriter('utf-8'))
      } else {
        this.binary_files[filename] = await entry.getData(new zip.Uint8ArrayWriter())
      }
    }
  }

  async writeEPUB() {
    const blobWriter = new zip.BlobWriter('application/epub+zip')

    // EPUB Zip cannot have extra attributes, so no extended timestamp
    const writer = new zip.ZipWriter(blobWriter, { extendedTimestamp: false })

    // First write mimetype file
    if ('mimetype' in this.files) {
      await writer.add('mimetype', new zip.TextReader(this.files['mimetype']), { level: 0 })
    }

    // Add text file
    for (const file in this.files) {
      if (file === 'mimetype') {
        // We have already added mimetype file
        continue
      }
      await writer.add(file, new zip.TextReader(this.files[file]))
    }

    // Add binary file
    for (const file in this.binary_files) {
      await writer.add(file, new zip.Uint8ArrayReader(this.binary_files[file]))
    }

    // Finalize file
    await writer.close()
    return blobWriter.getData()
  }
}

filePicker.addEventListener('change', async (e) => {
  const selectedFile = e.target.files[0]
  setMainStatus(TXT_PROCESSING)
  outputDiv.innerHTML = ''
  btnDlAll.style.display = 'none'

  for (const file of e.target.files) {
    await processEPUB(file, file.name)
  }
  setMainStatus(TXT_DONE)

  if (e.target.files.length > 1) {
    btnDlAll.style.display = 'block'
  }
})

async function processEPUB (inputBlob, name) {
  try {
    // Load EPUB
    const epub = new EPUBBook()
    await epub.readEPUB(inputBlob)

    // Run fixing procedure (order matters!)

    // 1. Metadata fixes (OPF)
    epub.fixUniqueIdentifier()
    epub.fixBookLanguage()
    epub.cleanOPFMetadata()

    // 2. Navigation fixes (NCX)
    epub.fixNCXPlayOrder()
    epub.normalizeNCXUnicode()

    // 3. Content fixes (HTML/XHTML)
    epub.fixBodyIdLink()
    epub.reserializeHTML()  // DOM round-trip with script/image cleanup, epub: attrs, b/i conversion
    epub.addBoldItalicCSS() // Add CSS rules for converted bold/italic spans

    // 4. Final encoding fix (must be last for HTML files)
    epub.fixEncoding()

    // Write EPUB
    const blob = await epub.writeEPUB()
    const idx = filenames.length
    filenames.push(name)
    fixedBlobs.push(blob)

    if (epub.fixedProblems.length > 0) {
      keepOriginalFilename.checked ? dlfilenames.push(name) : dlfilenames.push("(fixed) " + name)
      outputDiv.appendChild(build_output_html(idx, epub.fixedProblems))
    } else {
      keepOriginalFilename.checked ? dlfilenames.push(name) : dlfilenames.push("(repacked) " + name)
      outputDiv.appendChild(build_output_html(idx, TXT_NO_ERROR))
    }
  } catch (e) {
    console.error(e)
    const idx = filenames.length
    filenames.push(name)
    while (fixedBlobs.length !== filenames.length) {
      fixedBlobs.push(null)
    }
    while (dlfilenames.length !== filenames.length) {
      dlfilenames.push(null)
    }
    outputDiv.appendChild(build_output_html(idx, TXT_SYS_ERROR))
  }
}

async function downloadAll() {
  const old = mainStatusDiv.innerHTML
  mainStatusDiv.innerHTML = 'Preparing download...'
  const blobWriter = new zip.BlobWriter('application/zip')
  const writer = new zip.ZipWriter(blobWriter, { extendedTimestamp: false })
  for (let i = 0; i < fixedBlobs.length; i++) {
    if (fixedBlobs[i])
      await writer.add(dlfilenames[i], new zip.BlobReader(fixedBlobs[i]))
  }
  await writer.close()
  const blob = blobWriter.getData()
  saveAs(blob, 'fixed-epubs.zip')
  mainStatusDiv.innerHTML = old
}

btnDlAll.addEventListener('click', downloadAll)
