import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import LiquidGlass from 'liquid-glass-react';

export default function LiquidGlassExample() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme === 'dark' ? '#ffffff' : '#000000' }]}>
          Liquid Glass Test
        </Text>
        
        {/* Basic liquid glass example */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme === 'dark' ? '#ffffff' : '#000000' }]}>
            Basic Example:
          </Text>
          <LiquidGlass>
            <View style={styles.glassContent}>
              <Text style={styles.glassText}>Hello Liquid Glass!</Text>
            </View>
          </LiquidGlass>
        </View>

        {/* Button example */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme === 'dark' ? '#ffffff' : '#000000' }]}>
            Button Example:
          </Text>
          <LiquidGlass
            displacementScale={64}
            blurAmount={0.1}
            saturation={130}
            aberrationIntensity={2}
            elasticity={0.35}
            cornerRadius={20}
            padding="12px 24px"
            onClick={() => console.log('Liquid glass button clicked!')}
          >
            <Text style={styles.buttonText}>Click Me</Text>
          </LiquidGlass>
        </View>

        {/* Custom styled example */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme === 'dark' ? '#ffffff' : '#000000' }]}>
            Custom Example:
          </Text>
          <LiquidGlass
            displacementScale={80}
            blurAmount={0.08}
            saturation={150}
            elasticity={0.25}
            cornerRadius={16}
            overLight={theme === 'light'}
            style={{ marginTop: 10 }}
          >
            <View style={styles.customContent}>
              <Text style={styles.customText}>Custom Glass Effect</Text>
              <Text style={styles.customSubtext}>With different settings</Text>
            </View>
          </LiquidGlass>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  glassContent: {
    padding: 20,
    alignItems: 'center',
  },
  glassText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  customContent: {
    padding: 16,
    alignItems: 'center',
  },
  customText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  customSubtext: {
    color: '#e0e0e0',
    fontSize: 14,
  },
});
