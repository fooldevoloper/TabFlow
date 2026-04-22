class UrlPatternMatcher {
  /**
   * Normalize a URL or pattern for comparison
   * Preserves user's input format (www., protocol) for matching
   * Only removes trailing slashes
   */
  static normalize(url, includeQuery = false) {
    if (!url || typeof url !== 'string') return '';
    
    let normalized = url.toLowerCase().trim();
    
    // Remove query params and fragments (unless includeQuery is true)
    if (!includeQuery) {
      const queryIndex = normalized.indexOf('?');
      const fragmentIndex = normalized.indexOf('#');
      const cutoff = Math.min(
        queryIndex === -1 ? Infinity : queryIndex,
        fragmentIndex === -1 ? Infinity : fragmentIndex
      );
      if (cutoff !== Infinity) {
        normalized = normalized.slice(0, cutoff);
      }
    }
    
    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');
    
    return normalized;
  }

  /**
   * Extract the full identifier from a URL (hostname + pathname + query)
   * Preserves user's input format (www., protocol)
   */
  static extractFullIdentifier(url) {
    if (!url || typeof url !== 'string') return '';
    
    try {
      const parsed = new URL(url);
      let hostname = parsed.hostname;
      
      const pathname = parsed.pathname || '/';
      const search = parsed.search || '';
      
      return hostname + pathname + search;
    } catch (error) {
      return this.normalize(url, true);
    }
  }

  /**
   * Check if two hostnames match (handles www. prefix differences)
   * E.g., "www.slack.com" matches "slack.com" and vice versa
   */
  static hostnamesMatch(hostname1, hostname2) {
    const h1 = hostname1.toLowerCase();
    const h2 = hostname2.toLowerCase();
    
    if (h1 === h2) return true;
    
    // Check if one is www. version of the other
    if (h1.startsWith('www.') && h1.slice(4) === h2) return true;
    if (h2.startsWith('www.') && h2.slice(4) === h1) return true;
    
    return false;
  }

  /**
   * Find exact match for a URL against group patterns
   * Returns match only if the full URL (including path + query) matches exactly
   * Also handles www. prefix differences
   * 
   * @param {string} url - The tab URL to match
   * @param {Array<{id: string, name: string, domains: string[]}>} groups - All group configurations
   * @returns {{groupId: string|null, groupName: string|null, pattern: string}|null}
   */
  static findExactMatch(url, groups) {
    const fullUrl = this.extractFullIdentifier(url);
    if (!fullUrl) return null;
    
    const urlHostname = new URL(url).hostname;
    const urlPathname = new URL(url).pathname;
    const urlSearch = new URL(url).search;
    
    for (const group of groups) {
      if (!group.domains || group.domains.length === 0) continue;
      
      for (const pattern of group.domains) {
        try {
          const patternParsed = new URL(pattern);
          const patternHostname = patternParsed.hostname;
          const patternPathname = patternParsed.pathname;
          const patternSearch = patternParsed.search;
          
          // Check if hostnames match (handling www.)
          if (!this.hostnamesMatch(urlHostname, patternHostname)) continue;
          
          // Check if path and query match
          if (urlPathname === patternPathname && urlSearch === patternSearch) {
            return {
              groupId: group.id,
              groupName: group.name,
              pattern: pattern
            };
          }
        } catch (e) {
          // If pattern is not a valid URL, try the old way
          const patternIdentifier = this.extractFullIdentifier(pattern);
          if (patternIdentifier && patternIdentifier === fullUrl) {
            return {
              groupId: group.id,
              groupName: group.name,
              pattern: pattern
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Calculate how many characters of the pattern match the beginning of the URL
   * Returns 0 if no match
   * Handles www. prefix differences
   * 
   * Examples:
   *   pattern: "google.com/docs"
   *   url: "https://google.com/docs/guide"
   *   match: "google.com/docs" (17 chars)
   * 
   *   pattern: "google.com"
   *   url: "https://google.com/docs/guide"  
   *   match: "google.com" (10 chars)
   * 
   *   pattern: "slack.com"
   *   url: "app.slack.com"
   *   match: "slack.com" (9 chars) - subdomain match
   * 
   *   pattern: "www.slack.com"
   *   url: "slack.com"
   *   match: "www.slack.com" (14 chars) - www. match
   */
  static calculateMatchLength(pattern, url) {
    const normalizedPattern = this.normalize(pattern);
    const normalizedUrl = this.normalize(url);
    
    if (!normalizedPattern || !normalizedUrl) return 0;
    
    // Check for exact match (URL starts with pattern)
    if (normalizedUrl.startsWith(normalizedPattern)) {
      const nextCharIndex = normalizedPattern.length;
      if (nextCharIndex < normalizedUrl.length) {
        const nextChar = normalizedUrl[nextCharIndex];
        if (nextChar !== '/' && nextChar !== '.' && nextChar !== ':') {
          return 0;
        }
      }
      return normalizedPattern.length;
    }
    
    // Check for subdomain match (URL ends with .pattern)
    if (normalizedUrl.endsWith('.' + normalizedPattern)) {
      return normalizedPattern.length;
    }
    
    // Check for www. prefix match
    // E.g., pattern="www.slack.com", url="slack.com" matches
    const patternWithoutWww = normalizedPattern.startsWith('www.') ? normalizedPattern.slice(4) : null;
    const urlWithoutWww = normalizedUrl.startsWith('www.') ? normalizedUrl.slice(4) : null;
    
    if (patternWithoutWww && urlWithoutWww) {
      if (urlWithoutWww.startsWith(patternWithoutWww)) {
        const nextCharIndex = patternWithoutWww.length;
        if (nextCharIndex < urlWithoutWww.length) {
          const nextChar = urlWithoutWww[nextCharIndex];
          if (nextChar !== '/' && nextChar !== '.' && nextChar !== ':') {
            return 0;
          }
        }
        // Return the original pattern length (with www.)
        return normalizedPattern.length;
      }
      if (urlWithoutWww.endsWith('.' + patternWithoutWww)) {
        return normalizedPattern.length;
      }
    }
    
    return 0;
  }

  /**
   * Find the best matching group for a URL using longest prefix matching
   * 
   * @param {string} url - The tab URL to match
   * @param {Array<{id: string, name: string, domains: string[]}>} groups - All group configurations
   * @returns {{groupId: string|null, groupName: string|null, matchLength: number, pattern: string}}
   */
  static findBestMatch(url, groups) {
    let bestGroupId = null;
    let bestGroupName = null;
    let longestMatchLength = 0;
    let bestPattern = '';
    
    for (const group of groups) {
      if (!group.domains || group.domains.length === 0) continue;
      
      for (const pattern of group.domains) {
        const matchLength = this.calculateMatchLength(pattern, url);
        
        if (matchLength > longestMatchLength) {
          longestMatchLength = matchLength;
          bestGroupId = group.id;
          bestGroupName = group.name;
          bestPattern = pattern;
        }
      }
    }
    
    return {
      groupId: bestGroupId,
      groupName: bestGroupName,
      matchLength: longestMatchLength,
      pattern: bestPattern
    };
  }
}
