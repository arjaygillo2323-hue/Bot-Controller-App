import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ---------- One drifting soft-edged glow (many gradient stops = smooth blur-like fade) ----------
function GlowBlob({ colors, locations, size, startX, startY, rangeX, rangeY, duration }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, rangeX] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, rangeY] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: startY,
        left: startX,
        width: size,
        height: size,
        transform: [{ translateX }, { translateY }],
      }}
    >
      <LinearGradient
        colors={colors}
        locations={locations}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    </Animated.View>
  );
}

/**
 * AuroraBackground — very soft, low-opacity ambient glow.
 * Uses 6-stop gradients (peak fading through many steps to fully transparent)
 * to mimic a heavy blur without relying on native blur support.
 */
export default function AuroraBackground({ isDark = true, height = SCREEN_H * 0.6 }) {
  const blobSize = SCREEN_W * 1.5
  ;
  const bg = isDark ? '#0a0a0a' : '#f2ede2';

  // 6-stop fade: peak -> 5 gradually fainter steps -> transparent.
  // Low peak opacity (0.16-0.2) keeps it subtle instead of a visible blob.
 // Pushes the fade out further so there is no solid "core"
 const stops = [0, 0.4, 0.65, 0.85, 0.95, 1];

  // Notice the highest opacity is now only 0.08 or 0.10.
    // This makes them extremely ghost-like so they blend together.
    const goldGrad = isDark
      ? ['rgba(255,179,0,0.10)', 'rgba(255,179,0,0.08)', 'rgba(255,179,0,0.05)', 'rgba(255,179,0,0.03)', 'rgba(255,179,0,0.01)', 'transparent']
      : ['rgba(230,150,0,0.10)', 'rgba(230,150,0,0.08)', 'rgba(230,150,0,0.05)', 'rgba(230,150,0,0.03)', 'rgba(230,150,0,0.01)', 'transparent'];

    const whiteGrad = isDark
      ? ['rgba(255,248,225,0.08)', 'rgba(255,248,225,0.06)', 'rgba(255,248,225,0.04)', 'rgba(255,248,225,0.02)', 'rgba(255,248,225,0.01)', 'transparent']
      : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)', 'transparent'];

    const orangeGrad = isDark
      ? ['rgba(255,111,0,0.09)', 'rgba(255,111,0,0.07)', 'rgba(255,111,0,0.05)', 'rgba(255,111,0,0.02)', 'rgba(255,111,0,0.01)', 'transparent']
      : ['rgba(230,110,20,0.09)', 'rgba(230,110,20,0.07)', 'rgba(230,110,20,0.05)', 'rgba(230,110,20,0.02)', 'rgba(230,110,20,0.01)', 'transparent'];

    const amberGrad = isDark
      ? ['rgba(230,81,0,0.07)', 'rgba(230,81,0,0.05)', 'rgba(230,81,0,0.03)', 'rgba(230,81,0,0.015)', 'rgba(230,81,0,0.005)', 'transparent']
      : ['rgba(200,90,10,0.07)', 'rgba(200,90,10,0.05)', 'rgba(200,90,10,0.03)', 'rgba(200,90,10,0.015)', 'rgba(200,90,10,0.005)', 'transparent'];

  return (
    <View style={[styles.wrap, { height, backgroundColor: bg }]} pointerEvents="none">
      <GlowBlob colors={whiteGrad} locations={stops} size={blobSize} startX={-blobSize * 0.55} startY={-blobSize * 0.5} rangeX={35} rangeY={25} duration={12000} />
      <GlowBlob colors={goldGrad} locations={stops} size={blobSize} startX={SCREEN_W / 2 - blobSize / 2} startY={-blobSize * 0.45} rangeX={-30} rangeY={30} duration={14000} />
      <GlowBlob colors={orangeGrad} locations={stops} size={blobSize} startX={SCREEN_W - blobSize * 0.55} startY={-blobSize * 0.4} rangeX={-25} rangeY={-20} duration={16000} />
      <GlowBlob colors={amberGrad} locations={stops} size={blobSize * 0.85} startX={SCREEN_W / 2 - (blobSize * 0.85) / 2} startY={height - blobSize * 0.55} rangeX={20} rangeY={-15} duration={10000} />

      <LinearGradient colors={['transparent', bg]} style={styles.bottomFade} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
});