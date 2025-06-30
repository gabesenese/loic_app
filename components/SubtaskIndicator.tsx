import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface SubtaskIndicatorProps {
  isDark?: boolean;
  style?: ViewStyle;
  size?: number;
}

export const SubtaskIndicator: React.FC<SubtaskIndicatorProps> = ({ 
  isDark = false, 
  style,
  size = 9 
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.25,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    breathingAnimation.start();

    return () => breathingAnimation.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#5c940d', // Consistent green color
          transform: [{ scale }],
          opacity,
        },
        style,
      ]}
    />
  );
}; 