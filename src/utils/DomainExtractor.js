class DomainExtractor {
  static SKIPPED_PROTOCOLS = [
    'chrome://',
    'chrome-extension://',
    'about:',
    'file://',
    'javascript:',
    'data:',
    'view-source:',
    'devtools://',
    'chrome-search://'
  ];

  static isSpecialUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    const lowerUrl = url.toLowerCase();
    return DomainExtractor.SKIPPED_PROTOCOLS.some(protocol =>
      lowerUrl.startsWith(protocol)
    );
  }

  extract(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    if (DomainExtractor.isSpecialUrl(url)) {
      return null;
    }

    try {
      const hostname = new URL(url).hostname;
      return hostname;
    } catch (error) {
      console.error('[DomainExtractor] Failed to parse URL:', url, error);
      return null;
    }
  }

  isValidUrl(url) {
    return url && typeof url === 'string' && !DomainExtractor.isSpecialUrl(url);
  }
}
