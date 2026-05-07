import React from 'react';
import { Modal, Platform, type ModalProps } from 'react-native';

type Props = Pick<ModalProps, 'visible' | 'onRequestClose' | 'children'> & {
  animationType?: ModalProps['animationType'];
};

/** Landscape-first so overlays match sideways gameplay (avoids tall portrait-style sheets on iOS). */
const GAME_SUPPORTED_ORIENTATIONS: NonNullable<ModalProps['supportedOrientations']> = [
  'landscape-left',
  'landscape-right',
  'portrait',
  'portrait-upside-down',
];

/**
 * Overlays for the TD game: avoids iOS presenting as a tall portrait sheet.
 */
export function GameModal({
  visible,
  onRequestClose,
  children,
  animationType = 'fade',
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      supportedOrientations={GAME_SUPPORTED_ORIENTATIONS}
      statusBarTranslucent
      onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}
