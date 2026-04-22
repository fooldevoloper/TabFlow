class TabGroupService {
  constructor(config, domainExtractor, colorGenerator, stateManager, groupManager) {
    this.config = config;
    this.domainExtractor = domainExtractor;
    this.colorGenerator = colorGenerator;
    this.stateManager = stateManager;
    this.groupManager = groupManager;
    this.isDragging = false;
    this.setupDragListeners();
  }
}
