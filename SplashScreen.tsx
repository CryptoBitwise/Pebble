import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onAnimationComplete: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
    const pebbleAnim = useRef(new Animated.Value(0)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;
    const textAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Pebble drop animation
        Animated.timing(pebbleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        // Ripple effect
        Animated.timing(rippleAnim, {
            toValue: 1,
            duration: 2000,
            delay: 600,
            useNativeDriver: true,
        }).start();

        // Text fade in
        Animated.timing(textAnim, {
            toValue: 1,
            duration: 1000,
            delay: 1300,
            useNativeDriver: true,
        }).start();

        // Fade out after 5 seconds
        setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                onAnimationComplete();
            });
        }, 5000);
    }, []);

    const pebbleTranslateY = pebbleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 0],
    });

    const pebbleScale = pebbleAnim.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [0.8, 1.1, 1],
    });

    const pebbleRotate = pebbleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rippleScale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 5],
    });

    const rippleOpacity = rippleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.8, 0.4, 0],
    });

    const textTranslateY = textAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
    });

    const pebbleOpacity = pebbleAnim.interpolate({
        inputRange: [0.8, 1],
        outputRange: [1, 0],
    });

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {/* Shimmer effect */}
            <View style={styles.shimmer} />

            {/* Pebble */}
            <Animated.View
                style={[
                    styles.pebble,
                    {
                        transform: [
                            { translateY: pebbleTranslateY },
                            { scale: pebbleScale },
                            { rotate: pebbleRotate },
                        ],
                        opacity: pebbleOpacity,
                    },
                ]}
            />

            {/* Ripples */}
            {[0, 1, 2, 3].map((index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.ripple,
                        {
                            transform: [{ scale: rippleScale }],
                            opacity: rippleOpacity,
                        },
                    ]}
                />
            ))}

            {/* App name and tagline */}
            <Animated.View
                style={[
                    styles.textContainer,
                    {
                        transform: [{ translateY: textTranslateY }],
                        opacity: textAnim,
                    },
                ]}
            >
                <Text style={styles.appName}>Pebble</Text>
                <Text style={styles.tagline}>Spend Smart, Live Better</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(74, 144, 226, 0.05)',
    },
    pebble: {
        width: 60,
        height: 60,
        backgroundColor: '#4A90E2',
        borderRadius: 30,
        position: 'absolute',
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    ripple: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(74, 144, 226, 0.6)',
        top: '50%',
        left: '50%',
        marginTop: -50,
        marginLeft: -50,
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 0,
    },
    appName: {
        fontSize: 48,
        fontWeight: '700',
        color: 'white',
        letterSpacing: -1,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    tagline: {
        fontSize: 16,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 10,
        letterSpacing: 0.5,
    },
});
