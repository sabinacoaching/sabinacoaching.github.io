/* Native details work individually even without JavaScript. */
(() => {
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
})();
