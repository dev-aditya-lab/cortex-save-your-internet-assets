const axios = require('axios');
const cheerio = require('cheerio');

function detectType(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) return 'youtube';
  if (u.includes('twitter.com/') || u.includes('x.com/')) return 'tweet';
  if (u.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i)) return 'image';
  if (u.match(/\.pdf(\?|$)/i)) return 'pdf';
  return 'article';
}

function extractYoutubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

async function fetchMetadata(url) {
  const type = detectType(url);
  const domain = extractDomain(url);

  // YouTube special handling
  if (type === 'youtube') {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      try {
        const { data } = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, {
          timeout: 5000
        });
        return {
          title: data.title || 'YouTube Video',
          description: data.author_name ? `By ${data.author_name}` : '',
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          type,
          domain
        };
      } catch {
        return {
          title: 'YouTube Video',
          description: '',
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          type,
          domain
        };
      }
    }
  }

  // Image URLs
  if (type === 'image') {
    return {
      title: url.split('/').pop().split('?')[0] || 'Image',
      description: '',
      thumbnail: url,
      type,
      domain
    };
  }

  // PDF URLs
  if (type === 'pdf') {
    return {
      title: decodeURIComponent(url.split('/').pop().split('?')[0]) || 'PDF Document',
      description: 'PDF Document',
      thumbnail: '',
      type,
      domain
    };
  }

  // General web pages (articles, tweets)
  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(data);

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      'Untitled';

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    const thumbnail =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';

    return {
      title: title.trim().substring(0, 300),
      description: description.trim().substring(0, 500),
      thumbnail,
      type,
      domain
    };
  } catch (err) {
    return {
      title: domain || url.substring(0, 100),
      description: '',
      thumbnail: '',
      type,
      domain
    };
  }
}

module.exports = { fetchMetadata, detectType, extractDomain };
