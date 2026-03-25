const axios = require('axios');
const cheerio = require('cheerio');

// =============================================
// CONTENT TYPE DETECTION
// =============================================

function detectType(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) return 'youtube';
  if (u.includes('twitter.com/') || u.includes('x.com/')) return 'tweet';
  if (u.includes('linkedin.com/posts') || u.includes('linkedin.com/pulse') || u.includes('linkedin.com/feed')) return 'linkedin';
  if (u.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i)) return 'image';
  if (u.match(/\.pdf(\?|$)/i)) return 'pdf';
  return 'article';
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function extractYoutubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// =============================================
// METADATA FETCHERS BY TYPE
// =============================================

async function fetchYoutubeMetadata(url) {
  const videoId = extractYoutubeId(url);
  const domain = 'youtube.com';

  try {
    const { data } = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { timeout: 5000 });
    const title = data.title || 'YouTube Video';
    const description = data.author_name ? `By ${data.author_name}` : '';
    const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    // Try to get more content from the page for better embeddings
    let contentText = `${title}. ${description}`;
    try {
      const { data: html } = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(html);
      const desc = $('meta[name="description"]').attr('content') || '';
      const keywords = $('meta[name="keywords"]').attr('content') || '';
      contentText = `${title}. ${desc}. ${keywords}`;
    } catch {}

    return { title, description, thumbnail, type: 'youtube', domain, contentText };
  } catch {
    return {
      title: 'YouTube Video',
      description: '',
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '',
      type: 'youtube',
      domain,
      contentText: 'YouTube Video'
    };
  }
}

async function fetchTweetMetadata(url) {
  const domain = extractDomain(url);

  try {
    // Use noembed to get tweet info
    const { data } = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { timeout: 5000 });

    if (data.error) throw new Error(data.error);

    // Extract text content from the HTML embed
    let tweetText = '';
    if (data.html) {
      const $ = cheerio.load(data.html);
      tweetText = $('blockquote p').text() || $('p').text() || '';
    }

    return {
      title: tweetText ? tweetText.substring(0, 100) : `Tweet by ${data.author_name || 'unknown'}`,
      description: tweetText || `Tweet from ${data.author_name || domain}`,
      thumbnail: '',
      type: 'tweet',
      domain,
      contentText: `Tweet by ${data.author_name || ''}. ${tweetText}`
    };
  } catch {
    // Fallback: try scraping
    try {
      const { data: html } = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const $ = cheerio.load(html);
      const title = $('meta[property="og:title"]').attr('content') || 'Tweet';
      const description = $('meta[property="og:description"]').attr('content') || '';
      const thumbnail = $('meta[property="og:image"]').attr('content') || '';
      return { title, description, thumbnail, type: 'tweet', domain, contentText: `${title}. ${description}` };
    } catch {
      return { title: 'Tweet', description: '', thumbnail: '', type: 'tweet', domain, contentText: 'Tweet' };
    }
  }
}

async function fetchLinkedInMetadata(url) {
  const domain = 'linkedin.com';

  try {
    const { data: html } = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content') || 'LinkedIn Post';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const thumbnail = $('meta[property="og:image"]').attr('content') || '';

    return {
      title: title.substring(0, 300),
      description: description.substring(0, 500),
      thumbnail,
      type: 'linkedin',
      domain,
      contentText: `LinkedIn post. ${title}. ${description}`
    };
  } catch {
    return { title: 'LinkedIn Post', description: '', thumbnail: '', type: 'linkedin', domain, contentText: 'LinkedIn post' };
  }
}

async function fetchImageMetadata(url) {
  const domain = extractDomain(url);
  const filename = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Image';
  return {
    title: filename,
    description: `Image from ${domain}`,
    thumbnail: url,
    type: 'image',
    domain,
    contentText: `Image: ${filename}. From ${domain}`
  };
}

async function fetchPdfMetadata(url) {
  const domain = extractDomain(url);
  const filename = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'PDF Document';
  return {
    title: filename,
    description: 'PDF Document',
    thumbnail: '',
    type: 'pdf',
    domain,
    contentText: `PDF document: ${filename}. From ${domain}`
  };
}

async function fetchArticleMetadata(url) {
  const domain = extractDomain(url);

  try {
    const { data: html } = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() || 'Untitled';

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') || '';

    const thumbnail =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') || '';

    // Extract article body text for better embeddings
    // Remove scripts, styles, navs, footers
    $('script, style, nav, footer, header, aside, iframe, noscript').remove();
    const bodyText = $('article').text() || $('main').text() || $('body').text() || '';
    const cleanText = bodyText.replace(/\s+/g, ' ').trim().substring(0, 2000);

    const contentText = `${title}. ${description}. ${cleanText}`;

    return {
      title: title.trim().substring(0, 300),
      description: description.trim().substring(0, 500),
      thumbnail,
      type: 'article',
      domain,
      contentText: contentText.substring(0, 2000)
    };
  } catch (err) {
    return {
      title: domain || url.substring(0, 100),
      description: '',
      thumbnail: '',
      type: 'article',
      domain,
      contentText: domain || url
    };
  }
}

// =============================================
// MAIN ENTRY POINT
// =============================================

async function fetchMetadata(url) {
  const type = detectType(url);
  console.log(`[META] Fetching metadata for ${type}: ${url}`);

  switch (type) {
    case 'youtube': return fetchYoutubeMetadata(url);
    case 'tweet': return fetchTweetMetadata(url);
    case 'linkedin': return fetchLinkedInMetadata(url);
    case 'image': return fetchImageMetadata(url);
    case 'pdf': return fetchPdfMetadata(url);
    default: return fetchArticleMetadata(url);
  }
}

module.exports = { fetchMetadata, detectType, extractDomain };
