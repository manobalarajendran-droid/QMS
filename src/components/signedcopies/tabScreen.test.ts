import { describe, expect, it } from 'vitest';
import { SCREEN_SLUGS } from '../../lib/router';
import { SIGNED_TABS } from './matchRules';
import { TAB_SCREEN } from './tabScreen';

describe('TAB_SCREEN', () => {
  it('sends every signed tab to a real screen', () => {
    for (const tab of SIGNED_TABS) expect(SCREEN_SLUGS[TAB_SCREEN[tab]]).toBeTruthy();
  });
  it('has no extra tabs', () => {
    expect(Object.keys(TAB_SCREEN).sort()).toEqual([...SIGNED_TABS].sort());
  });
});
