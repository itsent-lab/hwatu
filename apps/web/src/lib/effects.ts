export async function animateCardFlight(source: Element | null, target: Element | null, rotate = -5, duration = 280) {
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return;
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add('flying-card');
  Object.assign(clone.style, { left: `${sourceRect.left}px`, top: `${sourceRect.top}px`, width: `${sourceRect.width}px`, height: `${sourceRect.height}px` });
  document.body.append(clone);
  const deltaX = targetRect.left + targetRect.width / 2 - sourceRect.left - sourceRect.width / 2;
  const deltaY = targetRect.top + targetRect.height / 2 - sourceRect.top - sourceRect.height / 2;
  const animation = clone.animate([
    { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)' },
    { transform: `translate3d(${deltaX * .55}px,${deltaY * .35 - 34}px,0) rotate(${rotate}deg) scale(1.08)`, offset: .55 },
    { transform: `translate3d(${deltaX}px,${deltaY}px,0) rotate(${-rotate / 2}deg) scale(.96)` }
  ], { duration, easing: 'cubic-bezier(.2,.75,.18,1)', fill: 'forwards' });
  await animation.finished.catch(() => undefined);
  clone.remove();
  target.animate([
    { transform: 'scale(1)', filter: 'brightness(1)' },
    { transform: 'scale(1.025)', filter: 'brightness(1.2)', offset: .34 },
    { transform: 'scale(1)', filter: 'brightness(1)' }
  ], { duration: 170, easing: 'ease-out' });
}

export async function animateCapturedCardTransfers(cardIds: string[], sourceRack: Element | null, targetRack: Element | null) {
  if (!sourceRack || !targetRack) return;
  for (const cardId of cardIds) {
    const source = [...sourceRack.querySelectorAll<HTMLElement>('[data-card-id]')]
      .find(element => element.dataset.cardId === cardId);
    await animateCardFlight(source ?? null, targetRack, -9, 360);
  }
}
