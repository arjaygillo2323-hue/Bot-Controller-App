import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import useRobotViewModel from '../viewmodels/RobotViewModel';
import { useTheme } from '../theme/ThemeContext';
import AuroraBackground from '../components/AuroraBackground';

const DPAD_BTN = 74;

// ---------- Press feedback wrapper ----------
function PressableScale({ onPress, disabled, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.4 }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        activeOpacity={0.85}
        style={{ flex: 1, width: '100%', height: '100%' }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------- Moving light sweep (AEGIS-style chase) ----------
function ShimmerSweep({ active }) {
  const translateX = useRef(new Animated.Value(-130)).current;

  useEffect(() => {
    let loop;
    if (active) {
      loop = Animated.loop(Animated.timing(translateX, { toValue: 240, duration: 1100, useNativeDriver: true }));
      loop.start();
    }
    return () => loop && loop.stop();
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: 40, transform: [{ translateX }, { rotate: '20deg' }] }}>
        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
      </Animated.View>
    </View>
  );
}

// ---------- Shimmering header ----------
function ShimmerHeader({ theme }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const textShadowRadius = glow.interpolate({ inputRange: [0, 1], outputRange: [4, 20] });
  const color = glow.interpolate({ inputRange: [0, 1], outputRange: [theme.gold, theme.goldBright] });

  return (
    <Animated.Text style={[styles.headerTitle, { color, textShadowColor: theme.goldBright, textShadowRadius, textShadowOffset: { width: 0, height: 0 } }]}>
      🐝 BOT CONTROL
    </Animated.Text>
  );
}

// ---------- Glass panel ----------
function GlassPanel({ children, style, theme }) {
  return (
    <View style={[styles.panelBase, { borderColor: theme.panelBorder, backgroundColor: theme.panel }, style]}>
      {children}
    </View>
  );
}

function TelemetryStat({ label, value, theme }) {
  return (
    <View style={styles.telemetryStat}>
      <Text style={[styles.telemetryValue, { color: theme.goldBright }]}>{value}</Text>
      <Text style={[styles.telemetryLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ModeButton({ label, active, onPress, theme }) {
  return (
    <PressableScale onPress={onPress} style={styles.modeButtonWrap}>
      {active ? (
        <LinearGradient colors={[theme.goldBright, theme.gold]} style={styles.modeButton}>
          <Text style={styles.modeButtonActiveText}>{label}</Text>
          <ShimmerSweep active={active} />
        </LinearGradient>
      ) : (
        <View style={[styles.modeButton, { backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: theme.panelBorder }]}>
          <Text style={[styles.modeButtonText, { color: theme.textSecondary }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

function DPadButton({ icon, onPress, disabled, theme }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={[styles.dpadButtonWrap, { borderColor: theme.gold }]}>
      <Text style={[styles.dpadIcon, { color: theme.goldBright }]}>{icon}</Text>
    </PressableScale>
  );
}

function DPadSpacer() {
  return <View style={{ width: DPAD_BTN, height: DPAD_BTN, marginHorizontal: 6 }} />;
}

function ArmButton({ label, onPress, disabled, theme }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={styles.armButtonWrap}>
      <LinearGradient colors={[theme.goldBright, theme.gold]} style={styles.armButton}>
        <Text style={styles.armButtonText}>{label}</Text>
      </LinearGradient>
    </PressableScale>
  );
}

export default function ControlScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [ipInput, setIpInput] = useState('192.168.1.100');

  const connected = useRobotViewModel((state) => state.connected);
  const mode = useRobotViewModel((state) => state.mode);
  const speed = useRobotViewModel((state) => state.speed);
  const telemetry = useRobotViewModel((state) => state.telemetry);
  const errorMessage = useRobotViewModel((state) => state.errorMessage);

  const connect = useRobotViewModel((state) => state.connect);
  const disconnect = useRobotViewModel((state) => state.disconnect);
  const setMode = useRobotViewModel((state) => state.setMode);
  const setSpeed = useRobotViewModel((state) => state.setSpeed);
  const move = useRobotViewModel((state) => state.move);
  const armAction = useRobotViewModel((state) => state.armAction);

  const driveDisabled = mode === 'AUTO';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <AuroraBackground isDark={isDark} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: insets.top + 10 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
            <Text style={{ fontSize: 20 }}>{isDark ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
          <ShimmerHeader theme={theme} />
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>ESP32 ROBOT CONTROL UNIT</Text>
        </View>

        {/* Connection */}
        <GlassPanel theme={theme} style={styles.panel}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.panelBorder }]}
              value={ipInput}
              onChangeText={setIpInput}
              placeholder="192.168.1.100"
              placeholderTextColor={theme.textSecondary}
              editable={!connected}
            />
            <PressableScale onPress={() => (connected ? disconnect() : connect(ipInput))} style={styles.connectWrap}>
              <LinearGradient colors={connected ? ['#ff3d3d', '#a30000'] : [theme.goldBright, theme.gold]} style={styles.connectButton}>
                <Text style={styles.connectButtonText}>{connected ? 'DISCONNECT' : 'CONNECT'}</Text>
              </LinearGradient>
            </PressableScale>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: connected ? theme.success : theme.danger }]} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>{connected ? 'LINK ESTABLISHED' : 'OFFLINE'}</Text>
          </View>
          {errorMessage && <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>}
        </GlassPanel>

        {/* Telemetry (compact) */}
        <GlassPanel theme={theme} style={styles.compactPanel}>
          <Text style={[styles.panelLabel, { color: theme.gold, marginBottom: 6, fontSize: 11 }]}>TELEMETRY</Text>
          <View style={styles.telemetryRow}>
            <TelemetryStat label="BATTERY" value={`${telemetry.batteryPercent}%`} theme={theme} />
            <TelemetryStat label="MODE" value={mode} theme={theme} />
            <TelemetryStat label="LINK" value={connected ? 'OK' : '--'} theme={theme} />
          </View>
        </GlassPanel>

        {/* Camera (bigger) */}
        <GlassPanel theme={theme} style={styles.panel}>
          <Text style={[styles.panelLabel, { color: theme.gold }]}>LIVE FEED</Text>
          <View style={[styles.cameraBox, { borderColor: theme.panelBorder }]}>
            <Text style={[styles.cameraPlaceholderText, { color: theme.textSecondary }]}>📷 NO SIGNAL</Text>
          </View>
        </GlassPanel>

        {/* Speed */}
        <GlassPanel theme={theme} style={styles.panel}>
          <Text style={[styles.panelLabel, { color: theme.gold }]}>SPEED — {speed}%</Text>
          <Slider
            style={{ width: '100%', height: 36 }}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={speed}
            minimumTrackTintColor={theme.gold}
            maximumTrackTintColor={theme.panelBorder}
            thumbTintColor={theme.goldBright}
            onSlidingComplete={setSpeed}
          />
        </GlassPanel>

        {/* Mode */}
        <GlassPanel theme={theme} style={styles.panel}>
          <Text style={[styles.panelLabel, { color: theme.gold }]}>CONTROL MODE</Text>
          <View style={styles.modeToggle}>
            <ModeButton label="MANUAL" active={mode === 'MANUAL'} onPress={() => setMode('MANUAL')} theme={theme} />
            <ModeButton label="AUTO" active={mode === 'AUTO'} onPress={() => setMode('AUTO')} theme={theme} />
          </View>
        </GlassPanel>

        {/* Drive + Arm */}
        <GlassPanel theme={theme} style={styles.panel}>
          <View style={styles.driveArmRow}>
            <View style={styles.driveSection}>
              <Text style={[styles.panelLabel, { color: theme.gold }]}>DRIVE</Text>

              <View style={styles.dpadRow}>
                <DPadSpacer />
                <DPadButton icon="▲" onPress={() => move('FORWARD')} disabled={driveDisabled} theme={theme} />
                <DPadSpacer />
              </View>

              <View style={styles.dpadRow}>
                <DPadButton icon="◀" onPress={() => move('LEFT')} disabled={driveDisabled} theme={theme} />
                <PressableScale onPress={() => move('STOP')} style={styles.stopWrap}>
                  <LinearGradient colors={['#ff3d3d', '#a30000']} style={styles.stopButton}>
                    <Text style={styles.stopText}>STOP</Text>
                  </LinearGradient>
                </PressableScale>
                <DPadButton icon="▶" onPress={() => move('RIGHT')} disabled={driveDisabled} theme={theme} />
              </View>

              <View style={styles.dpadRow}>
                <DPadSpacer />
                <DPadButton icon="▼" onPress={() => move('BACKWARD')} disabled={driveDisabled} theme={theme} />
                <DPadSpacer />
              </View>
            </View>

            <View style={[styles.verticalDivider, { backgroundColor: theme.panelBorder }]} />

            <View style={styles.armSection}>
              <Text style={[styles.panelLabel, { color: theme.gold }]}>ARM</Text>
              <View style={styles.armColumn}>
                <ArmButton label="GRAB" onPress={() => armAction('ARM_GRAB')} theme={theme} />
                <ArmButton label="HOME" onPress={() => armAction('ARM_HOME')} theme={theme} />
                <ArmButton label="RELEASE" onPress={() => armAction('ARM_RELEASE')} theme={theme} />
              </View>
            </View>
          </View>
        </GlassPanel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  header: { paddingBottom: 20, alignItems: 'center' },
  themeToggle: { position: 'absolute', right: 20, top: 0, padding: 6 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', letterSpacing: 2 },
  headerSubtitle: { fontSize: 11, letterSpacing: 3, marginTop: 6 },

  panelBase: { borderWidth: 1, borderRadius: 16 },
  panel: { padding: 16, marginHorizontal: 16, marginBottom: 14 },
  compactPanel: { paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 10 },
  panelLabel: { fontSize: 13, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },

  row: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: 'rgba(0,0,0,0.2)' },
  connectWrap: { borderRadius: 8 },
  connectButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  connectButtonText: { color: '#000', fontWeight: 'bold', fontSize: 13 },

  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontSize: 13, letterSpacing: 1 },
  errorText: { marginTop: 8, fontSize: 13 },

  cameraBox: { height: 340, backgroundColor: '#000000', borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cameraPlaceholderText: { fontSize: 15 },

  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  telemetryStat: { alignItems: 'center', flex: 1 },
  telemetryValue: { fontSize: 16, fontWeight: 'bold' },
  telemetryLabel: { fontSize: 9, marginTop: 3, letterSpacing: 1 },

  modeToggle: { flexDirection: 'row', gap: 14 },
  modeButtonWrap: { flex: 1, borderRadius: 10, overflow: 'hidden', height: 54 },
  modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  modeButtonActiveText: { color: '#000', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
  modeButtonText: { fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },

  driveArmRow: { flexDirection: 'row', justifyContent: 'space-between' },
  driveSection: { flex: 1.4 },
  armSection: { flex: 1 },
  verticalDivider: { width: 1, marginHorizontal: 12 },

  dpadRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 5 },
  dpadButtonWrap: {
    width: DPAD_BTN,
    height: DPAD_BTN,
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadIcon: { fontSize: 26, textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  stopWrap: {
    width: DPAD_BTN,
    height: DPAD_BTN,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  stopButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stopText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  armColumn: { gap: 10 },
  armButtonWrap: { borderRadius: 8, overflow: 'hidden' },
  armButton: { paddingVertical: 14, alignItems: 'center', width: '100%' },
  armButtonText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
});