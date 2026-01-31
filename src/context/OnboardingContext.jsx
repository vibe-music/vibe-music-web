import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { safeStorage } from '../utils/safeStorage';

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [isFirstTimersTour, setIsFirstTimersTour] = useState(false);
    const [isCompleted, setIsCompleted] = useState(!!safeStorage.getItem('vibe_onboarding_status'));
    // Track if onboarding was already completed before this session started
    const [onboardingAlreadyDone] = useState(!!safeStorage.getItem('vibe_onboarding_status'));

    useEffect(() => {
        const firstVisit = safeStorage.getItem('vibe_first_visit');
        if (!firstVisit) {
            safeStorage.setItem('vibe_first_visit', Date.now().toString());
        }
    }, []);

    const startTour = useCallback((isFirstTime = false) => {
        setIsFirstTimersTour(isFirstTime);
        setStepIndex(0);
        setRun(true);
    }, []);

    const completeOnboarding = useCallback((status = 'completed') => {
        setRun(false);
        setStepIndex(0);
        safeStorage.setItem('vibe_onboarding_status', status);
        setIsCompleted(true);
    }, []);

    const stopTour = useCallback(() => {
        completeOnboarding('completed');
    }, [completeOnboarding]);

    const nextStep = useCallback(() => {
        setStepIndex(prev => prev + 1);
    }, []);

    const value = useMemo(() => ({
        run,
        setRun,
        stepIndex,
        setStepIndex,
        startTour,
        stopTour,
        completeOnboarding,
        nextStep,
        isFirstTimersTour,
        isCompleted,
        onboardingAlreadyDone
    }), [run, stepIndex, isFirstTimersTour, isCompleted, onboardingAlreadyDone, startTour, stopTour, completeOnboarding, nextStep]);

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
};
