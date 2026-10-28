/* Native details work individually even without JavaScript. */
(() => {
  const storyButton = document.querySelector('.about-story-toggle');
  const storyContent = document.getElementById('about-story-content');
  if (storyButton && storyContent) {
    storyContent.hidden = true;
    storyButton.hidden = false;
    storyButton.addEventListener('click', () => {
      const expanded = storyButton.getAttribute('aria-expanded') === 'true';
      storyButton.setAttribute('aria-expanded', String(!expanded));
      storyContent.hidden = expanded;
    });
  }
  for (const block of document.querySelectorAll("[data-situations]")) {
    const cards = [...block.querySelectorAll(".situation-details")];
    for (const button of block.querySelectorAll("[data-situations-action]")) {
      button.addEventListener("click", () => {
        const open = button.dataset.situationsAction === "open";
        for (const card of cards) card.open = open;
      });
      button.hidden = false;
    }
  }
  const equalBlocks = [...document.querySelectorAll('[data-equalize-cards]')];
  const number = value => Number.parseFloat(value) || 0;
  function equalize(block) {
    const cards = [...block.querySelectorAll('.situation-card:not(.situation-card--wide)')];
    if (!cards.length) return;
    const heights = cards.map(card => {
      const style = getComputedStyle(card);
      const title = card.querySelector(':scope > .situation-title');
      const summary = card.querySelector('summary');
      let height = number(style.paddingTop) + number(style.paddingBottom) + number(style.borderTopWidth) + number(style.borderBottomWidth);
      if (title) {
        const titleStyle = getComputedStyle(title);
        height += title.getBoundingClientRect().height + number(titleStyle.marginTop) + number(titleStyle.marginBottom);
      }
      return height + summary.getBoundingClientRect().height;
    });
    block.style.setProperty('--closed-card-height', Math.ceil(Math.max(...heights)) + 'px');
  }
  const widths = new WeakMap();
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (widths.get(entry.target) === entry.contentRect.width) continue;
      widths.set(entry.target, entry.contentRect.width);
      requestAnimationFrame(() => equalize(entry.target));
    }
  });
  for (const block of equalBlocks) {
    equalize(block);
    observer.observe(block);
  }
  document.fonts.ready.then(() => equalBlocks.forEach(equalize));
})();
