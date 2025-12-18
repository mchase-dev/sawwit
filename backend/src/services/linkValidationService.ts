import { AppError } from '../middleware/errorHandler';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  isValid: boolean;
}

class LinkValidationService {
  private readonly TIMEOUT = 10000; // 10 seconds
  private readonly MAX_REDIRECTS = 5;
  private readonly BLOCKED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254', // AWS metadata endpoint
  ];

  /**
   * Validate a URL
   */
  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);

      // Check protocol
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      // Check for blocked domains
      const hostname = parsed.hostname.toLowerCase();
      if (this.BLOCKED_DOMAINS.some((blocked) => hostname.includes(blocked))) {
        return false;
      }

      // Check for private IP ranges
      if (this.isPrivateIP(hostname)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIP(hostname: string): boolean {
    // IPv4 private ranges
    const privateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    ];

    return privateRanges.some((range) => range.test(hostname));
  }

  /**
   * Fetch link preview metadata
   */
  async fetchLinkPreview(url: string): Promise<LinkPreview> {
    if (!this.validateUrl(url)) {
      throw new AppError(400, 'Invalid or disallowed URL');
    }

    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        maxRedirects: this.MAX_REDIRECTS,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SawwitBot/1.0; +https://sawwit.com/bot)',
          Accept: 'text/html',
        },
        validateStatus: (status) => status < 400,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract Open Graph metadata
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const ogDescription = $('meta[property="og:description"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');
      const ogSiteName = $('meta[property="og:site_name"]').attr('content');

      // Fallback to Twitter Card metadata
      const twitterTitle = $('meta[name="twitter:title"]').attr('content');
      const twitterDescription = $('meta[name="twitter:description"]').attr('content');
      const twitterImage = $('meta[name="twitter:image"]').attr('content');

      // Fallback to standard HTML metadata
      const htmlTitle = $('title').text();
      const htmlDescription = $('meta[name="description"]').attr('content');

      // Extract favicon
      let favicon =
        $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href');

      if (favicon && !favicon.startsWith('http')) {
        const baseUrl = new URL(url);
        favicon = `${baseUrl.protocol}//${baseUrl.host}${favicon.startsWith('/') ? '' : '/'}${favicon}`;
      }

      // Extract first image if no OG/Twitter image
      let image = ogImage || twitterImage;
      if (!image) {
        const firstImg = $('img').first().attr('src');
        if (firstImg) {
          const baseUrl = new URL(url);
          image = firstImg.startsWith('http')
            ? firstImg
            : `${baseUrl.protocol}//${baseUrl.host}${firstImg.startsWith('/') ? '' : '/'}${firstImg}`;
        }
      }

      return {
        url: response.request.res.responseUrl || url, // Final URL after redirects
        title: ogTitle || twitterTitle || htmlTitle || undefined,
        description:
          ogDescription || twitterDescription || htmlDescription || undefined,
        image: image || undefined,
        siteName: ogSiteName || undefined,
        favicon: favicon || undefined,
        isValid: true,
      };
    } catch (error: any) {
      // Handle specific errors
      if (error.code === 'ENOTFOUND') {
        throw new AppError(400, 'Domain not found');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new AppError(408, 'Request timeout - link may be unavailable');
      } else if (error.response?.status === 404) {
        throw new AppError(404, 'Link not found (404)');
      } else if (error.response?.status === 403) {
        throw new AppError(403, 'Access forbidden (403)');
      } else if (error.response?.status >= 500) {
        throw new AppError(502, 'Remote server error');
      }

      // Generic error
      return {
        url,
        isValid: false,
      };
    }
  }

  /**
   * Check if a URL is reachable (lightweight check)
   */
  async isUrlReachable(url: string): Promise<boolean> {
    if (!this.validateUrl(url)) {
      return false;
    }

    try {
      const response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: this.MAX_REDIRECTS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SawwitBot/1.0)',
        },
        validateStatus: (status) => status < 400,
      });

      return response.status < 400;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if URL is from a trusted domain (for embedding)
   */
  isTrustedDomain(url: string): boolean {
    const trustedDomains = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'twitter.com',
      'x.com',
      'github.com',
      'stackoverflow.com',
      'imgur.com',
      'giphy.com',
      'streamable.com',
      'soundcloud.com',
      'spotify.com',
    ];

    const domain = this.extractDomain(url);
    if (!domain) return false;

    return trustedDomains.some((trusted) => domain.includes(trusted));
  }

  /**
   * Sanitize URL (remove tracking parameters)
   */
  sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Common tracking parameters to remove
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'msclkid',
        'ref',
        'source',
      ];

      trackingParams.forEach((param) => {
        parsed.searchParams.delete(param);
      });

      return parsed.toString();
    } catch (error) {
      return url;
    }
  }

  /**
   * Check if URL points to an image
   */
  isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      return imageExtensions.some((ext) => pathname.endsWith(ext));
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if URL points to a video
   */
  isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'streamable.com'];

    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      const domain = parsed.hostname.toLowerCase();

      return (
        videoExtensions.some((ext) => pathname.endsWith(ext)) ||
        videoDomains.some((vDomain) => domain.includes(vDomain))
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get content type from URL (makes HEAD request)
   */
  async getContentType(url: string): Promise<string | null> {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: this.MAX_REDIRECTS,
      });

      return response.headers['content-type'] || null;
    } catch (error) {
      return null;
    }
  }
}

export default new LinkValidationService();
