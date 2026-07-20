export interface CardActivationDecision {
  selectedCardId: string | null;
  play: boolean;
}

export function decideCardActivation(selectedCardId: string | null, cardId: string, pointerType: string, confirmationEnabled: boolean): CardActivationDecision {
  if (!confirmationEnabled || (pointerType !== 'touch' && pointerType !== 'pen')) return { selectedCardId: null, play: true };
  if (selectedCardId === cardId) return { selectedCardId: null, play: true };
  return { selectedCardId: cardId, play: false };
}
