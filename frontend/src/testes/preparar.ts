// O jsdom não calcula layout: sem isto, todo elemento parece invisível e o prcMoverFoco não acha ninguém.
HTMLElement.prototype.getClientRects = function getClientRects(): DOMRectList {
  return [{}] as unknown as DOMRectList;
};
