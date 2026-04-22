class TitleParser {
  static TITLE_PATTERNS = {
    UPPERCASE_WITH_OPTIONAL_PREFIX: /^(?:\S+\s+)?([A-Z]+)(?:\s*\(\d+\))?$/i,
    NUMBERED_PREFIX: /^(\d+)\.\s*(.+?)\s*\((\d+)\)$/,
    COUNT_ONLY: /^(?:\S+\s+)?(\S+?)\s*\((\d+)\)$/,
    EMOJI_COUNT_ONLY: /^(\S+)\s*\((\d+)\)$/
  };

  static extractCategoryName(title, knownCategories = null) {
    if (!title || typeof title !== 'string') {
      return null;
    }

    const match = title.match(TitleParser.TITLE_PATTERNS.UPPERCASE_WITH_OPTIONAL_PREFIX);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }

    const countOnlyMatch = title.match(TitleParser.TITLE_PATTERNS.COUNT_ONLY);
    if (countOnlyMatch && countOnlyMatch[1]) {
      const potentialCategory = countOnlyMatch[1].toUpperCase();
      if (knownCategories && knownCategories.has(potentialCategory)) {
        return potentialCategory;
      }
      return potentialCategory;
    }

    if (knownCategories) {
      for (const category of knownCategories.keys()) {
        if (title.includes(category)) {
          return category;
        }
        const emoji = knownCategories.get(category);
        if (emoji && title.includes(emoji)) {
          return category;
        }
      }
    }

    return null;
  }

  static extractAllParts(title) {
    if (!title || typeof title !== 'string') {
      return { emoji: null, name: null, count: null };
    }

    const parts = title.split(/\s+/);
    const result = { emoji: null, name: null, count: null };

    if (parts.length === 0) {
      return result;
    }

    const lastPart = parts[parts.length - 1];
    const countMatch = lastPart.match(/^\((\d+)\)$/);
    if (countMatch) {
      result.count = parseInt(countMatch[1], 10);
      parts.pop();
    }

    const firstPart = parts[0];
    if (firstPart && /^[\u{1F300}-\u{1F9FF}]$/u.test(firstPart)) {
      result.emoji = firstPart;
      parts.shift();
    }

    if (parts.length > 0) {
      const nameMatch = parts.join(' ').match(/^([A-Z]+)$/i);
      if (nameMatch) {
        result.name = nameMatch[1].toUpperCase();
      } else if (parts.length === 1) {
        result.name = parts[0].toUpperCase();
      }
    }

    return result;
  }

  static buildTitleFromParts(emoji, name, count) {
    const parts = [];
    if (emoji) parts.push(emoji);
    if (name) parts.push(name);
    if (count !== null && count !== undefined) parts.push(`(${count})`);
    return parts.join(' ');
  }
}
