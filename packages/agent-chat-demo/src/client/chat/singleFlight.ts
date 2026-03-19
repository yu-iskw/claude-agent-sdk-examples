export type LoadingPhase = 'idle' | 'plan' | 'execute';

/**
 * Claim the client-side single-flight slot synchronously to block overlapping sends.
 */
export function tryStartLoadingPhase(
  phaseRef: { current: LoadingPhase },
  nextPhase: Exclude<LoadingPhase, 'idle'>,
): boolean {
  if (phaseRef.current !== 'idle') {
    return false;
  }
  phaseRef.current = nextPhase;
  return true;
}
