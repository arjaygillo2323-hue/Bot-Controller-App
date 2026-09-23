import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

export default function AuroraBackground({ isDark = true, height = SCREEN_H * 0.6 }) {
  const blobSize = SCREEN_W * 1.6;
  const bg = isDark ? '#05070d' : '#eef4f7';

  const stops = [0, 0.15, 0.32, 0.5, 0.7, 1];

  const cyanGrad = isDark
    ? ['rgba(0,246,255,0.20)', 'rgba(0,246,255,0.14)', 'rgba(0,246,255,0.09)', 'rgba(0,246,255,0.05)', 'rgba(0,246,255,0.02)', 'transparent']
    : ['rgba(0,150,180,0.18)', 'rgba(0,150,180,0.13)', 'rgba(0,150,180,0.08)', 'rgba(0,150,180,0.04)', 'rgba(0,150,180,0.02)', 'transparent'];
  const magentaGrad = isDark
    ? ['rgba(255,0,229,0.16)', 'rgba(255,0,229,0.12)', 'rgba(255,0,229,0.07)', 'rgba(255,0,229,0.04)', 'rgba(255,0,229,0.02)', 'transparent']
    : ['rgba(214,0,180,0.15)', 'rgba(214,0,180,0.10)', 'rgba(214,0,180,0.06)', 'rgba(214,0,180,0.03)', 'rgba(214,0,180,0.015)', 'transparent'];
  const blueGrad = isDark
    ? ['rgba(40,80,255,0.16)', 'rgba(40,80,255,0.12)', 'rgba(40,80,255,0.07)', 'rgba(40,80,255,0.04)', 'rgba(40,80,255,0.02)', 'transparent']
    : ['rgba(40,80,200,0.14)', 'rgba(40,80,200,0.10)', 'rgba(40,80,200,0.06)', 'rgba(40,80,200,0.03)', 'rgba(40,80,200,0.015)', 'transparent'];
  const violetGrad = isDark
    ? ['rgba(130,0,255,0.12)', 'rgba(130,0,255,0.09)', 'rgba(130,0,255,0.06)', 'rgba(130,0,255,0.03)', 'rgba(130,0,255,0.015)', 'transparent']
    : ['rgba(120,0,220,0.1)', 'rgba(120,0,220,0.07)', 'rgba(120,0,220,0.045)', 'rgba(120,0,220,0.02)', 'rgba(120,0,220,0.01)', 'transparent'];

  return (
    <View style={[styles.wrap, { height, backgroundColor: bg }]} pointerEvents="none">
      <GlowBlob colors={blueGrad} locations={stops} size={blobSize} startX={-blobSize * 0.55} startY={-blobSize * 0.5} rangeX={35} rangeY={25} duration={12000} />
      <GlowBlob colors={cyanGrad} locations={stops} size={blobSize} startX={SCREEN_W / 2 - blobSize / 2} startY={-blobSize * 0.45} rangeX={-30} rangeY={30} duration={14000} />
      <GlowBlob colors={magentaGrad} locations={stops} size={blobSize} startX={SCREEN_W - blobSize * 0.55} startY={-blobSize * 0.4} rangeX={-25} rangeY={-20} duration={16000} />
      <GlowBlob colors={violetGrad} locations={stops} size={blobSize * 0.85} startX={SCREEN_W / 2 - (blobSize * 0.85) / 2} startY={height - blobSize * 0.55} rangeX={20} rangeY={-15} duration={10000} />
      <LinearGradient colors={['transparent', bg]} style={styles.bottomFade} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', zIndex: 0 },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
});