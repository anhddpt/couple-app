import { fireEvent, render } from '@testing-library/react-native';

import { ChibiAvatar } from './ChibiAvatar';

describe('ChibiAvatar', () => {
  it('renders the selected mood and sends a head intent', () => {
    const onHeadPress = jest.fn();
    const { getByLabelText, getByText } = render(
      <ChibiAvatar
        name="An"
        presetId="coral"
        mood="angry"
        onHeadPress={onHeadPress}
      />,
    );

    expect(getByText('ಠ 益 ಠ')).toBeTruthy();
    fireEvent.press(getByLabelText('An head'));
    expect(onHeadPress).toHaveBeenCalledTimes(1);
  });
});
