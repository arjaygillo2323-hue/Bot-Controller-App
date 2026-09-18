import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import ControlScreen from './src/views/ControlScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ControlScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}