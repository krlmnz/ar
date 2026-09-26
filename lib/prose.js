/* Turn rendered markdown into the structures a few layouts need.
 * Authors still write ordinary markdown. These helpers only read the HTML.
 */

function stripInline(html) {
  return String(html || '')
    .replace(/<a\b[^>]*class="[^"]*heading-anchor[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSections(html) {
  const source = html || '';
  const re = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
  const matches = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    matches.push({
      index: m.index,
      end: re.lastIndex,
      attrs: m[1],
      inner: m[2]
    });
  }
  if (!matches.length) return { intro: source.trim(), sections: [] };

  const sections = matches.map((h, i) => {
    const id = (h.attrs.match(/\sid="([^"]+)"/i) || [])[1] || '';
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index : source.length;
    return {
      id,
      title: stripInline(h.inner),
      html: source.slice(h.end, bodyEnd).trim()
    };
  });

  return {
    intro: source.slice(0, matches[0].index).trim(),
    sections
  };
}

/* Wrap each h2 and the content that follows it in <section class="lesson">. */
function lessons(html) {
  if (!html || !/<h2[\s>]/i.test(html)) return html || '';
  const parts = html.split(/(?=<h2[\s>])/i);
  const intro = parts[0];
  const body = parts.slice(1)
    .map((part) => `<section class="lesson">\n${part}</section>`)
    .join('\n');
  return intro + body;
}

function asFaq(html) {
  return splitSections(html);
}

function asDays(html) {
  const { intro, sections } = splitSections(html);
  const days = sections.map((section) => {
    let body = section.html || '';
    let place = '';
    const placeLine = body.match(/<p>\s*place:\s*([a-z0-9-]+)\s*<\/p>/i);
    if (placeLine) {
      place = placeLine[1];
      body = body.replace(placeLine[0], '').trim();
    }

    let overline = '';
    let title = section.title;
    const day = title.match(/^(Day\s+\d+)\s*[—–:-]\s+(.+)$/i);
    if (day) {
      overline = day[1];
      title = day[2];
    }

    return { id: section.id, overline, title, html: body, place };
  });

  return { intro, days };
}

function asGallery(html) {
  const source = html || '';
  // Markdown keeps a single newline inside one paragraph, so the caption
  // often sits in the same <p> as the image. A blank line makes a second <p>.
  const re = /<p>\s*(<img\b[^>]*>)\s*(?:<em>([\s\S]*?)<\/em>\s*)?<\/p>(?:\s*<p>\s*<em>([\s\S]*?)<\/em>\s*<\/p>)?/gi;
  const figures = [];
  let intro = null;
  let last = 0;
  let m;
  while ((m = re.exec(source)) !== null) {
    if (intro === null) intro = source.slice(0, m.index).trim();
    const img = m[1];
    const captionHtml = m[2] || m[3] || '';
    figures.push({
      src: (img.match(/\ssrc="([^"]*)"/i) || [])[1] || '',
      alt: (img.match(/\salt="([^"]*)"/i) || [])[1] || '',
      caption: captionHtml ? stripInline(captionHtml) : ''
    });
    last = re.lastIndex;
  }
  if (!figures.length) return { intro: source.trim(), figures: [], tail: '' };
  return {
    intro: intro || '',
    figures,
    tail: source.slice(last).trim()
  };
}

module.exports = { splitSections, lessons, asFaq, asDays, asGallery };
