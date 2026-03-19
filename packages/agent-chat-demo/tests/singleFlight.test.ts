import { describe, expect, it } from 'vitest';
import { tryStartLoadingPhase } from '../src/client/chat/singleFlight';

describe('tryStartLoadingPhase', () => {
  it('claims the single-flight slot only once until reset', () => {
    const ref = { current: 'idle' as const | 'plan' | 'execute' };

    expect(tryStartLoadingPhase(ref, 'plan')).toBe(true);
    expect(ref.current).toBe('plan');

    expect(tryStartLoadingPhase(ref, 'plan')).toBe(false);
    expect(tryStartLoadingPhase(ref, 'execute')).toBe(false);
    expect(ref.current).toBe('plan');
  });
});
