import * as React from 'react';
import { createRoot } from 'test-renderer';

import { ThemedText } from '../ThemedText';

it('renders correctly', async () => {
  const root = createRoot();
  await React.act(async () => {
    root.render(<ThemedText>Snapshot test!</ThemedText>);
  });

  const text = root.container.children[0];
  if (typeof text === 'string') {
    throw new Error('Expected the themed text host component');
  }
  expect(text.toJSON()).toMatchSnapshot();

  await React.act(async () => {
    root.unmount();
  });
});
