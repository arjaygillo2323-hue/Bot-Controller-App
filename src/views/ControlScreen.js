import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
   Animated,
   Image,
 } from 'react-native';

import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

import useRobotViewModel from '../viewmodels/RobotViewModel';
import { useTheme } from '../theme/ThemeContext';
import AuroraBackground from '../components/AuroraBackground';

const DPAD_BTN = 74;
const JOYSTICK_SIZE = 220;
const JOYSTICK_EDGE = (JOYSTICK_SIZE - DPAD_BTN) / 2;


// ============================================================
// DOUBLE-BUFFERED ESP32-CAM CAPTURE
// UNCHANGED CAMERA LOGIC
// ============================================================

function useDoubleBufferedCamera(captureUrl) {
  const [frames, setFrames] = useState([null, null]);
  const [activeSlot, setActiveSlot] = useState(-1);
  const [error, setError] = useState(false);

  const mountedRef = useRef(false);
  const timerRef = useRef(null);
  const activeSlotRef = useRef(-1);
  const frameRequestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    activeSlotRef.current = -1;
    frameRequestIdRef.current = 0;

    if (!captureUrl) {
      setFrames([null, null]);
      setActiveSlot(-1);
      setError(false);

      return () => {
        mountedRef.current = false;

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }

    setFrames([null, null]);
    setActiveSlot(-1);
    setError(false);

    const firstUrl = `${captureUrl}?t=${Date.now()}`;

    setFrames([firstUrl, null]);

    return () => {
      mountedRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [captureUrl]);

  const requestNextFrame = (slot) => {
    if (!mountedRef.current || !captureUrl) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }

      const requestId = frameRequestIdRef.current + 1;
      frameRequestIdRef.current = requestId;

      const nextUrl =
        `${captureUrl}?t=${Date.now()}_${requestId}`;

      setFrames((current) => {
        const updated = [...current];
        updated[slot] = nextUrl;
        return updated;
      });
    }, 120);
  };

  const handleFrameLoad = (slot) => {
    if (!mountedRef.current) {
      return;
    }

    const currentActive = activeSlotRef.current;

    if (currentActive === -1) {
      setError(false);

      activeSlotRef.current = slot;
      setActiveSlot(slot);

      requestNextFrame(slot === 0 ? 1 : 0);

      return;
    }

    if (slot === currentActive) {
      return;
    }

    setError(false);

    activeSlotRef.current = slot;
    setActiveSlot(slot);

    requestNextFrame(currentActive);
  };

  const handleFrameError = (slot) => {
    if (!mountedRef.current) {
      return;
    }

    if (slot !== activeSlotRef.current) {
      setError(true);
      requestNextFrame(slot);
    }
  };

  return {
    frames,
    activeSlot,
    error,
    handleFrameLoad,
    handleFrameError,
  };
}

// ============================================================
// PRESS FEEDBACK WRAPPER
// ============================================================

function PressableScale({
  onPress,
  onPressIn: onHoldStart,
  onPressOut: onHoldEnd,
  disabled,
  style,
  children,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 40,
    }).start();

    if (onHoldStart) {
      onHoldStart();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
    }).start();

    if (onHoldEnd) {
      onHoldEnd();
    }
  };

  return (
    <Animated.View
      style={[
        style,
        { transform: [{ scale }] },
        disabled && { opacity: 0.4 },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.85}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================
// SHIMMER
// ============================================================

function ShimmerSweep({ active }) {
  const translateX = useRef(
    new Animated.Value(-130)
  ).current;

  useEffect(() => {
    let loop;

    if (active) {
      loop = Animated.loop(
        Animated.timing(translateX, {
          toValue: 240,
          duration: 1100,
          useNativeDriver: true,
        })
      );

      loop.start();
    }

    return () => {
      if (loop) {
        loop.stop();
      }
    };
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 40,
          transform: [
            { translateX },
            { rotate: '20deg' },
          ],
        }}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.85)',
            'transparent',
          ]}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );
}

function ShimmerHeader({ theme }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const textShadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 24],
  });

  const color = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [
      theme.gold,
      theme.goldBright,
    ],
  });

  return (
    <Animated.Text
      style={[
        styles.headerTitle,
        {
          color,
          textShadowColor: theme.goldBright,
          textShadowRadius,
          textShadowOffset: {
            width: 0,
            height: 0,
          },
        },
      ]}
    >
      ⚡ CYBERWIZ
    </Animated.Text>
  );
}

// ============================================================
// UI COMPONENTS
// ============================================================

function GlassPanel({ children, style, theme }) {
  return (
    <View
      style={[
        styles.panelBase,
        {
          borderColor: theme.panelBorder,
          backgroundColor: theme.panel,
          shadowColor: theme.gold,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function TelemetryStat({ label, value, theme }) {
  return (
    <View style={styles.telemetryStat}>
      <Text
        style={[
          styles.telemetryValue,
          { color: theme.goldBright },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.telemetryLabel,
          { color: theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ModeButton({
  label,
  active,
  onPress,
  theme,
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={styles.modeButtonWrap}
    >
      {active ? (
        <LinearGradient
          colors={[
            theme.goldBright,
            theme.gold,
          ]}
          style={styles.modeButton}
        >
          <Text style={styles.modeButtonActiveText}>
            {label}
          </Text>

          <ShimmerSweep active={active} />
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.modeButton,
            {
              backgroundColor:
                'rgba(0,0,0,0.3)',
              borderWidth: 1,
              borderColor:
                theme.panelBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

function DPadButton({
  icon,
  onMoveStart,
  onMoveEnd,
  disabled,
  theme,
  style,
}) {
  return (
    <PressableScale
      onPressIn={onMoveStart}
      onPressOut={onMoveEnd}
      disabled={disabled}
      style={[
        styles.dpadButtonWrap,
        {
          borderColor: theme.gold,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.dpadIcon,
          {
            color: theme.goldBright,
          },
        ]}
      >
        {icon}
      </Text>
    </PressableScale>
  );
}

function ArmButton({
  label,
  onPress,
  disabled,
  theme,
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={styles.armButtonWrap}
    >
      <LinearGradient
        colors={[
          theme.goldBright,
          theme.gold,
        ]}
        style={styles.armButton}
      >
        <Text style={styles.armButtonText}>
          {label}
        </Text>
      </LinearGradient>
    </PressableScale>
  );
}

// ============================================================
// LIVE CAMERA FEED
// UNCHANGED DOUBLE-BUFFERED /capture LOGIC
// ============================================================

function LiveCameraFeed({ streamUrl, theme }) {
  const [currentFrame, setCurrentFrame] = useState(null);
  const [nextFrame, setNextFrame] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);

  const timerRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (!streamUrl) {
      setCurrentFrame(null);
      setNextFrame(null);
      setLoadingNext(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      return () => {
        mountedRef.current = false;
      };
    }

    const captureUrl = streamUrl.replace(
      /\/stream\/?$/i,
      '/capture'
    );

    const requestNextFrame = () => {
      if (!mountedRef.current || loadingNext) {
        return;
      }

      const url =
        `${captureUrl}?t=${Date.now()}`;

      setLoadingNext(true);
      setNextFrame(url);
    };

    requestNextFrame();

    return () => {
      mountedRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [streamUrl]);

  if (!streamUrl) {
    return (
      <View
        style={[
          styles.cameraBox,
          {
            borderColor: theme.panelBorder,
            padding: 0,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={styles.cameraMessage}>
          <Text
            style={[
              styles.cameraMessageText,
              { color: theme.textSecondary },
            ]}
          >
            CAMERA OFFLINE
          </Text>
        </View>
      </View>
    );
  }

  const handleNextFrameLoaded = () => {
    if (!mountedRef.current || !nextFrame) {
      return;
    }

    // New frame is completely loaded.
    // Only now replace the old visible frame.
    setCurrentFrame(nextFrame);
    setNextFrame(null);
    setLoadingNext(false);

    // Give the ESP32-CAM a short breathing interval
    // before requesting another capture.
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }

      const captureUrl = streamUrl.replace(
        /\/stream\/?$/i,
        '/capture'
      );

      const url =
        `${captureUrl}?t=${Date.now()}`;

      setLoadingNext(true);
      setNextFrame(url);
    }, 100);
  };

  const handleNextFrameError = (error) => {
    console.log(
      'CAMERA FRAME ERROR:',
      error?.nativeEvent || error
    );

    if (!mountedRef.current) {
      return;
    }

    setNextFrame(null);
    setLoadingNext(false);

    // Keep displaying the previous successful frame.
    // Try again after a short delay.
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }

      const captureUrl = streamUrl.replace(
        /\/stream\/?$/i,
        '/capture'
      );

      const url =
        `${captureUrl}?t=${Date.now()}`;

      setLoadingNext(true);
      setNextFrame(url);
    }, 300);
  };

  return (
    <View
      style={[
        styles.cameraBox,
        {
          borderColor: theme.panelBorder,
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#000',
        },
      ]}
    >
      {currentFrame ? (
        <Image
          source={{ uri: currentFrame }}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cameraMessage}>
          <Text
            style={[
              styles.cameraMessageText,
              { color: theme.textSecondary },
            ]}
          >
            CONNECTING TO CAMERA...
          </Text>
        </View>
      )}

      {nextFrame && (
        <Image
          key={nextFrame}
          source={{ uri: nextFrame }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0,
          }}
          resizeMode="cover"
          onLoad={handleNextFrameLoaded}
          onError={handleNextFrameError}
        />
      )}
    </View>
  );
}

// ============================================================
// MAIN CONTROL SCREEN
// ============================================================

export default function ControlScreen() {
  const {
    theme,
    isDark,
    toggleTheme,
  } = useTheme();

  const insets = useSafeAreaInsets();

  // ----------------------------------------------------------
  // IP STATE
  // ----------------------------------------------------------

  const [ipInput, setIpInput] = useState('');
  const [cameraIpInput, setCameraIpInput] =
    useState('');

  const [cameraConnected, setCameraConnected] =
    useState(false);

  // ----------------------------------------------------------
  // ROBOT VIEW MODEL
  // ----------------------------------------------------------

  const connected =
    useRobotViewModel(
      (state) => state.connected
    );

  const mode =
    useRobotViewModel(
      (state) => state.mode
    );

  const speed =
    useRobotViewModel(
      (state) => state.speed
    );

  const telemetry =
    useRobotViewModel(
      (state) => state.telemetry
    );

  const errorMessage =
    useRobotViewModel(
      (state) => state.errorMessage
    );

  const connect =
    useRobotViewModel(
      (state) => state.connect
    );

  const disconnect =
    useRobotViewModel(
      (state) => state.disconnect
    );

  const setMode =
    useRobotViewModel(
      (state) => state.setMode
    );

  const setSpeed =
    useRobotViewModel(
      (state) => state.setSpeed
    );

  const move =
    useRobotViewModel(
      (state) => state.move
    );

  const armAction =
    useRobotViewModel(
      (state) => state.armAction
    );

  const driveDisabled =
    mode === 'AUTO';


  // ----------------------------------------------------------
  // CAMERA URL
  // ----------------------------------------------------------

  const cleanedCameraIp =
    cameraIpInput
      .trim()
      .replace(
        /^https?:\/\//i,
        ''
      );

  const streamUrl =
    cameraConnected &&
    cleanedCameraIp
      ? `http://${cleanedCameraIp}/capture`
      : null;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <AuroraBackground
        isDark={isDark}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom:
            insets.bottom + 40,
          paddingTop:
            insets.top + 10,
        }}
      >
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.themeToggle}
            onPress={toggleTheme}
          >
            <Text style={{ fontSize: 20 }}>
              {isDark ? '🌙' : '☀️'}
            </Text>
          </TouchableOpacity>

          <ShimmerHeader
            theme={theme}
          />

          <Text
            style={[
              styles.headerSubtitle,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            CYBER-BOT CONTROLLER APP
          </Text>
        </View>

        {/* ================================================== */}
        {/* ROBOT LINK */}
        {/* ================================================== */}

        <GlassPanel
          theme={theme}
          style={styles.panel}
        >
          <Text
            style={[
              styles.panelLabel,
              {
                color: theme.gold,
                marginBottom: 8,
              },
            ]}
          >
            ROBOT LINK
          </Text>

          <View style={styles.row}>
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    theme.textPrimary,
                  borderColor:
                    theme.panelBorder,
                },
              ]}
              value={ipInput}
              onChangeText={
                setIpInput
              }
              placeholder="Enter robot IP..."
              placeholderTextColor={
                theme.textSecondary
              }
              editable={!connected}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numeric"
            />

            <PressableScale
              onPress={() =>
                connected
                  ? disconnect()
                  : ipInput.trim()
                  ? connect(
                      ipInput.trim()
                    )
                  : null
              }
              disabled={
                !connected &&
                !ipInput.trim()
              }
              style={
                styles.connectWrap
              }
            >
              <LinearGradient
                colors={
                  connected
                    ? [
                        '#ff2f6d',
                        '#7a0030',
                      ]
                    : [
                        theme.goldBright,
                        theme.gold,
                      ]
                }
                style={
                  styles.connectButton
                }
              >
                <Text
                  style={
                    styles.connectButtonText
                  }
                >
                  {connected
                    ? 'DISCONNECT'
                    : 'CONNECT'}
                </Text>
              </LinearGradient>
            </PressableScale>
          </View>

          <View
            style={styles.statusRow}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    connected
                      ? theme.success
                      : theme.danger,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {connected
                ? 'LINK ESTABLISHED'
                : ipInput
                ? 'IP ENTERED — READY'
                : 'ENTER ROBOT IP'}
            </Text>
          </View>

          {errorMessage && (
            <Text
              style={[
                styles.errorText,
                {
                  color:
                    theme.danger,
                },
              ]}
            >
              {errorMessage}
            </Text>
          )}
        </GlassPanel>

        {/* ================================================== */}
        {/* CAMERA LINK */}
        {/* ================================================== */}

        <GlassPanel
          theme={theme}
          style={styles.panel}
        >
          <Text
            style={[
              styles.panelLabel,
              {
                color: theme.gold,
                marginBottom: 8,
              },
            ]}
          >
            CAMERA LINK
          </Text>

          <View style={styles.row}>
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    theme.textPrimary,
                  borderColor:
                    theme.panelBorder,
                },
              ]}
              value={cameraIpInput}
              onChangeText={
                setCameraIpInput
              }
              placeholder="Enter camera IP..."
              placeholderTextColor={
                theme.textSecondary
              }
              editable={
                !cameraConnected
              }
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numeric"
            />

            <PressableScale
              onPress={() =>
                setCameraConnected(
                  (current) =>
                    !current
                )
              }
              disabled={
                !cameraConnected &&
                !cameraIpInput.trim()
              }
              style={
                styles.connectWrap
              }
            >
              <LinearGradient
                colors={
                  cameraConnected
                    ? [
                        '#ff2f6d',
                        '#7a0030',
                      ]
                    : [
                        theme.goldBright,
                        theme.gold,
                      ]
                }
                style={
                  styles.connectButton
                }
              >
                <Text
                  style={
                    styles.connectButtonText
                  }
                >
                  {cameraConnected
                    ? 'DISCONNECT'
                    : 'CONNECT'}
                </Text>
              </LinearGradient>
            </PressableScale>
          </View>

          <View
            style={styles.statusRow}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    cameraConnected
                      ? theme.success
                      : theme.danger,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {cameraConnected
                ? 'CAMERA CONNECTED'
                : cameraIpInput
                ? 'IP ENTERED — READY'
                : 'ENTER CAMERA IP'}
            </Text>
          </View>
        </GlassPanel>

        {/* ================================================== */}
        {/* TELEMETRY */}
        {/* ================================================== */}

        <GlassPanel
          theme={theme}
          style={styles.compactPanel}
        >
          <Text
            style={[
              styles.panelLabel,
              {
                color: theme.gold,
                marginBottom: 6,
                fontSize: 11,
              },
            ]}
          >
            TELEMETRY
          </Text>

          <View
            style={styles.telemetryRow}
          >
            <TelemetryStat
              label="BATTERY"
              value={`${telemetry.batteryPercent}%`}
              theme={theme}
            />

            <TelemetryStat
              label="MODE"
              value={mode}
              theme={theme}
            />

            <TelemetryStat
              label="LINK"
              value={
                connected
                  ? 'OK'
                  : '--'
              }
              theme={theme}
            />
          </View>
        </GlassPanel>

        {/* ================================================== */}
        {/* LIVE FEED */}
        {/* ================================================== */}

        <GlassPanel
          theme={theme}
          style={styles.panel}
        >
          <Text
            style={[
              styles.panelLabel,
              {
                color: theme.gold,
              },
            ]}
          >
            LIVE FEED
          </Text>

          <LiveCameraFeed
            streamUrl={streamUrl}
            theme={theme}
          />
        </GlassPanel>

        {/* ================================================== */}
        {/* SPEED */}
        {/* ================================================== */}

        <GlassPanel
          theme={theme}
          style={styles.panel}
        >
          <Text
            style={[
              styles.panelLabel,
              {
                color: theme.gold,
              },
            ]}
          >
            SPEED — {speed}%
          </Text>

          <Slider
            style={{
              width: '100%',
              height: 36,
            }}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={speed}
            minimumTrackTintColor={
              theme.gold
            }
            maximumTrackTintColor={
              theme.panelBorder
            }
            thumbTintColor={
              theme.goldBright
            }
            onSlidingComplete={
              setSpeed
            }
          />
        </GlassPanel>

        {/* ================================================== */}
        {/* CONTROL MODE */}
        {/* ================================================== */}

        <GlassPanel
          theme={theme}
          style={styles.panel}
        >
          <Text
            style={[
              styles.panelLabel,
              {
                color: theme.gold,
              },
            ]}
          >
            CONTROL MODE
          </Text>

          <View
            style={styles.modeToggle}
          >
            <ModeButton
              label="MANUAL"
              active={
                mode === 'MANUAL'
              }
              onPress={() =>
                setMode('MANUAL')
              }
              theme={theme}
            />

            <ModeButton
              label="AUTO"
              active={
                mode === 'AUTO'
              }
              onPress={() =>
                setMode('AUTO')
              }
              theme={theme}
            />
          </View>
        </GlassPanel>

        {/* ================================================== */}
        {/* DRIVE + ARM */}
        {/* ================================================== */}

        <GlassPanel
          theme={theme}
          style={styles.panel}
        >
          <View
            style={
              styles.driveArmRow
            }
          >
            {/* DRIVE */}

            <View
              style={
                styles.driveSection
              }
            >
              <Text
                style={[
                  styles.panelLabel,
                  {
                    color:
                      theme.gold,
                  },
                ]}
              >
                DRIVE
              </Text>

              <View
                style={
                  styles.joystickWrap
                }
              >
                <View
                  style={[
                    styles.joystickRingOuter,
                    {
                      borderColor:
                        theme.panelBorder,
                    },
                  ]}
                  pointerEvents="none"
                />

                <View
                  style={[
                    styles.joystickRingInner,
                    {
                      borderColor:
                        theme.goldDim ||
                        theme.panelBorder,
                    },
                  ]}
                  pointerEvents="none"
                />

                <DPadButton
                  icon="▲"
                  onMoveStart={() =>
                    move('FORWARD')
                  }
                  onMoveEnd={() =>
                    move('STOP')
                  }
                  disabled={
                    driveDisabled
                  }
                  theme={theme}
                  style={
                    styles.joystickUp
                  }
                />

                <DPadButton
                  icon="◀"
                  onMoveStart={() =>
                    move('LEFT')
                  }
                  onMoveEnd={() =>
                    move('STOP')
                  }
                  disabled={
                    driveDisabled
                  }
                  theme={theme}
                  style={
                    styles.joystickLeft
                  }
                />

                <DPadButton
                  icon="▶"
                  onMoveStart={() =>
                    move('RIGHT')
                  }
                  onMoveEnd={() =>
                    move('STOP')
                  }
                  disabled={
                    driveDisabled
                  }
                  theme={theme}
                  style={
                    styles.joystickRight
                  }
                />

                <DPadButton
                  icon="▼"
                  onMoveStart={() =>
                    move('BACKWARD')
                  }
                  onMoveEnd={() =>
                    move('STOP')
                  }
                  disabled={
                    driveDisabled
                  }
                  theme={theme}
                  style={
                    styles.joystickDown
                  }
                />

                <PressableScale
                  onPress={() =>
                    move('STOP')
                  }
                  style={
                    styles.joystickCenter
                  }
                >
                  <LinearGradient
                    colors={[
                      '#ff2f6d',
                      '#7a0030',
                    ]}
                    style={
                      styles.stopButton
                    }
                  >
                    <Text
                      style={
                        styles.stopText
                      }
                    >
                      STOP
                    </Text>
                  </LinearGradient>
                </PressableScale>
              </View>
            </View>

            <View
              style={[
                styles.verticalDivider,
                {
                  backgroundColor:
                    theme.panelBorder,
                },
              ]}
            />

            {/* ARM */}

            <View
              style={
                styles.armSection
              }
            >
              <Text
                style={[
                  styles.panelLabel,
                  {
                    color:
                      theme.gold,
                  },
                ]}
              >
                ARM
              </Text>

              <View
                style={
                  styles.armColumn
                }
              >
                <ArmButton
                  label="GRAB"
                  onPress={() =>
                    armAction(
                      'ARM_GRAB'
                    )
                  }
                  theme={theme}
                />

                <ArmButton
                  label="HOME"
                  onPress={() =>
                    armAction(
                      'ARM_HOME'
                    )
                  }
                  theme={theme}
                />

                <ArmButton
                  label="RELEASE"
                  onPress={() =>
                    armAction(
                      'ARM_RELEASE'
                    )
                  }
                  theme={theme}
                />
              </View>
            </View>
          </View>
        </GlassPanel>
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },

  header: {
    paddingBottom: 20,
    alignItems: 'center',
  },

  themeToggle: {
    position: 'absolute',
    right: 20,
    top: 0,
    padding: 6,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 3,
  },

  headerSubtitle: {
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 6,
  },


  // ==========================================================
  // PANELS
  // ==========================================================

  panelBase: {
    borderWidth: 1,
    borderRadius: 8,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },

  panel: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
  },

  compactPanel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 10,
  },

  panelLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 12,
  },

  // ==========================================================
  // CONNECTION
  // ==========================================================

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 13,
    backgroundColor:
      'rgba(0,0,0,0.3)',
  },

  connectWrap: {
    borderRadius: 6,
  },

  connectButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  connectButtonText: {
    color: '#02141a',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  statusText: {
    fontSize: 13,
    letterSpacing: 1,
  },

  errorText: {
    marginTop: 8,
    fontSize: 13,
  },

  // ==========================================================
  // CAMERA
  // ==========================================================

  cameraBox: {
    height: 340,
    backgroundColor: '#000000',
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraFrame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },

  cameraMessage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },

  cameraMessageText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },

  cameraUrlText: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },

  // ==========================================================
  // TELEMETRY
  // ==========================================================

  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  telemetryStat: {
    alignItems: 'center',
    flex: 1,
  },

  telemetryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  telemetryLabel: {
    fontSize: 9,
    marginTop: 3,
    letterSpacing: 2,
  },

  // ==========================================================
  // MODE
  // ==========================================================

  modeToggle: {
    flexDirection: 'row',
    gap: 14,
  },

  modeButtonWrap: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    height: 54,
  },

  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },

  modeButtonActiveText: {
    color: '#02141a',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 2,
  },

  modeButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 2,
  },

  // ==========================================================
  // DRIVE + ARM
  // ==========================================================

  driveArmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  driveSection: {
    flex: 1.4,
    alignItems: 'center',
  },

  armSection: {
    flex: 1,
  },

  verticalDivider: {
    width: 1,
    marginHorizontal: 12,
  },

  // ==========================================================
  // JOYSTICK
  // ==========================================================

  joystickWrap: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    marginTop: 4,
  },

  joystickRingOuter: {
    position: 'absolute',
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    borderRadius:
      JOYSTICK_SIZE / 2,
    borderWidth: 2,
  },

  joystickRingInner: {
    position: 'absolute',
    width:
      JOYSTICK_SIZE - 60,
    height:
      JOYSTICK_SIZE - 60,
    borderRadius:
      (JOYSTICK_SIZE - 60) / 2,
    top: 30,
    left: 30,
    borderWidth: 1,
    opacity: 0.6,
  },

  dpadButtonWrap: {
    width: DPAD_BTN,
    height: DPAD_BTN,
    borderRadius: 14,
    backgroundColor:
      'rgba(0,10,15,0.65)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },

  joystickUp: {
    top: 6,
    left: JOYSTICK_EDGE,
  },

  joystickDown: {
    bottom: 6,
    left: JOYSTICK_EDGE,
  },

  joystickLeft: {
    left: 6,
    top: JOYSTICK_EDGE,
  },

  joystickRight: {
    right: 6,
    top: JOYSTICK_EDGE,
  },

  joystickCenter: {
    position: 'absolute',
    top: JOYSTICK_EDGE,
    left: JOYSTICK_EDGE,
    width: DPAD_BTN,
    height: DPAD_BTN,
    borderRadius:
      DPAD_BTN / 2,
    overflow: 'hidden',
  },

  dpadIcon: {
    fontSize: 24,
  },

  stopButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius:
      DPAD_BTN / 2,
  },

  stopText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1,
  },

  // ==========================================================
  // ARM
  // ==========================================================

  armColumn: {
    gap: 10,
  },

  armButtonWrap: {
    borderRadius: 6,
    overflow: 'hidden',
  },

  armButton: {
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },

  armButtonText: {
    color: '#02141a',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
});