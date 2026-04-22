class ColorGenerator {
  static COLORS = ['grey', 'cyan', 'blue', 'yellow', 'red', 'green', 'pink', 'purple', 'orange'];

  generate(input) {
    const hash = this.hashString(input);
    const index = Math.abs(hash) % ColorGenerator.COLORS.length;
    return ColorGenerator.COLORS[index];
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }
}
