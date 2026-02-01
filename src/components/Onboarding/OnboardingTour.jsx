import { useEffect, useRef } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./OnboardingTour.css";
import { useOnboarding } from '../../context/OnboardingContext';
import onboardingData from '../../data/onboardingData.json';

const OnboardingTour = () => {
    const { run, stepIndex, setStepIndex, stopTour } = useOnboarding();
    const driverObj = useRef(null);

    useEffect(() => {
        const waitForElement = (selector, timeout = 10000) => {
            return new Promise((resolve) => {
                const element = document.querySelector(selector);
                if (element) return resolve(element);

                const observer = new MutationObserver(() => {
                    const el = document.querySelector(selector);
                    if (el) {
                        resolve(el);
                        observer.disconnect();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    observer.disconnect();
                    resolve(null);
                }, timeout);
            });
        };

        if (run) {
            const isTransitioning = { current: false };

            const updatePopoverText = (newText) => {
                const popoverDesc = document.querySelector('.driver-popover-description');
                if (popoverDesc) popoverDesc.innerText = newText;
            };

            const toggleNextButton = (disabled) => {
                const nextBtn = document.querySelector('.driver-popover-next-btn');
                if (nextBtn) {
                    nextBtn.disabled = disabled;
                    nextBtn.style.opacity = disabled ? '0.5' : '1';
                    nextBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
                    nextBtn.innerText = disabled ? 'Loading...' : 'Next';
                }
            };

            driverObj.current = driver({
                showProgress: true,
                popoverClass: 'driverjs-theme',
                // Allow users to click the elements directly
                allowClose: false,
                onNextClick: (element, step, options) => {
                    const activeIndex = driverObj.current.getActiveIndex();

                    if (isTransitioning.current) return;

                    // Step 0: Click FAB
                    if (activeIndex === 0) {
                        const fab = document.getElementById('btn-fab-add');
                        if (fab) {
                            fab.click();
                            setTimeout(() => driverObj.current.moveNext(), 300);
                            return;
                        }
                    }

                    // Step 1: Simulate Search "Hip Hop"
                    if (activeIndex === 1) {
                        isTransitioning.current = true;

                        // 1. Disable Next Button & Show Loading
                        toggleNextButton(true);
                        updatePopoverText("Searching for 'Hip Hop'...");

                        const input = document.getElementById('onboarding-search-input');
                        if (input) {
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                            nativeInputValueSetter.call(input, onboardingData.albumSearch.query);
                            input.dispatchEvent(new Event('input', { bubbles: true }));

                            setTimeout(() => {
                                const form = input.closest('form');
                                if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

                                // Wait for results to appear before moving next
                                waitForElement('#onboarding-result-0').then(() => {
                                    isTransitioning.current = false;
                                    driverObj.current.moveNext();
                                });
                            }, 500);
                            return;
                        }
                    }

                    // Step 2: Click First Result -> Add Album -> Wait for Home
                    if (activeIndex === 2) {
                        isTransitioning.current = true;
                        toggleNextButton(true);
                        updatePopoverText("Adding album...");

                        const result = document.getElementById('onboarding-result-0');
                        if (result) {
                            const addBtn = result.querySelector('.btn-primary');
                            if (addBtn) addBtn.click();

                            // Wait for Home to update with new album
                            waitForElement('#onboarding-recent-album-0').then((recentAlbum) => {
                                if (recentAlbum) {
                                    // Once album appears on Home, just move to the next step (which will highlight it)
                                    isTransitioning.current = false;
                                    driverObj.current.moveNext();
                                } else {
                                    // Handle failure case - unlock UI so user isn't stuck
                                    isTransitioning.current = false;
                                    toggleNextButton(false);
                                    updatePopoverText("Something went wrong. Try clicking Next again.");
                                }
                            });
                            return;
                        }
                    }

                    // Step 3: Click Recent Album -> Navigate to Detail
                    if (activeIndex === 3) {
                        isTransitioning.current = true;
                        toggleNextButton(true);
                        updatePopoverText("Opening album...");

                        const recentAlbum = document.getElementById('onboarding-recent-album-0');
                        if (recentAlbum) {
                            recentAlbum.click(); // Navigates to AlbumDetail

                            // Wait for AlbumDetail to load track list
                            waitForElement('#onboarding-track-0').then((track) => {
                                if (track) {
                                    isTransitioning.current = false;
                                    driverObj.current.moveNext();
                                } else {
                                    isTransitioning.current = false;
                                    toggleNextButton(false);
                                }
                            });
                            return;
                        }
                    }

                    // Step 4: Click Track to Open Modal
                    if (activeIndex === 4) {
                        // Auto-click the track's "Add URL" button
                        const track = document.getElementById('onboarding-track-0');
                        if (track) {
                            const addUrlBtn = track.querySelector('button');
                            if (addUrlBtn) {
                                addUrlBtn.click(); // Open Add URL Modal
                            } else {
                                // Fallback: try clicking track itself if button not found (unlikely)
                                track.click();
                            }

                            // Wait for modal input to appear
                            waitForElement('#onboarding-url-input').then((input) => {
                                if (input) {
                                    driverObj.current.moveNext();
                                } else {
                                    // Modal didn't open? Just move next to avoid stuck state
                                    driverObj.current.moveNext();
                                }
                            });
                            return;
                        } else {
                            // If track not found, just move next to avoid blocking
                            driverObj.current.moveNext();
                            return;
                        }
                    }

                    // Step 5: Fill URL and Save
                    if (activeIndex === 5) {
                        isTransitioning.current = true;
                        toggleNextButton(true);

                        const urlInput = document.getElementById('onboarding-url-input');
                        if (urlInput) {
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                            nativeInputValueSetter.call(urlInput, onboardingData.songDetails.url);
                            urlInput.dispatchEvent(new Event('input', { bubbles: true }));

                            setTimeout(() => {
                                const saveBtn = document.getElementById('onboarding-save-url');
                                if (saveBtn) saveBtn.click();

                                // Wait for track to become playable (UI update)
                                waitForElement('.track-item__status--ready').then((readyTrack) => {
                                    isTransitioning.current = false;
                                    driverObj.current.moveNext();
                                });
                            }, 500);
                            return;
                        } else {
                            // Input not found (maybe modal closed?), just proceed
                            // Or should we fail? Better to advance to Play step than freeze.
                            isTransitioning.current = false;
                            driverObj.current.moveNext();
                            return;
                        }
                    }

                    // Step 6: Play Song
                    if (activeIndex === 6) {
                        // Auto-click the track again to play it (since it now has a URL)
                        const track = document.getElementById('onboarding-track-0');
                        if (track) {
                            track.click();
                        }

                        // Just move to next step immediately
                        setTimeout(() => {
                            driverObj.current.moveNext();
                        }, 300);
                        return;
                    }

                    driverObj.current.moveNext();
                },
                steps: [
                    {
                        element: '#btn-fab-add',
                        popover: {
                            title: 'Start Here',
                            description: onboardingData.messages.fab,
                            side: "top",
                            align: 'start'
                        }
                    },
                    {
                        element: '#onboarding-search-input',
                        popover: {
                            title: 'Search for Music',
                            description: onboardingData.messages.search,
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#onboarding-result-0',
                        popover: {
                            title: 'Pick an Album',
                            description: onboardingData.messages.add,
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#onboarding-recent-album-0',
                        popover: {
                            title: 'Open Your Album',
                            description: onboardingData.messages.albumClick,
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#onboarding-track-0',
                        popover: {
                            title: 'Add a Song',
                            description: onboardingData.messages.trackClick,
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#onboarding-url-input',
                        popover: {
                            title: 'Source URL',
                            description: onboardingData.messages.songUrl,
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#onboarding-track-0', // Re-target track to show play button?
                        popover: {
                            title: 'Play the Vibe',
                            description: onboardingData.messages.play,
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '.user-badge-premium', // Target premium badge? Or maybe header?
                        popover: {
                            title: 'Go Pro?',
                            description: `${onboardingData.messages.premium} <br/><br/> <a href="${onboardingData.links.tutorial}" target="_blank" style="color: var(--color-primary); text-decoration: underline;">View Full Tutorial</a>`,
                            side: "bottom",
                            align: 'end'
                        }
                    }
                ],
                onDestroyed: () => {
                    stopTour();
                },
                onHighlightStarted: (element, step) => {
                    if (driverObj.current) {
                        const activeIndex = driverObj.current.getActiveIndex();
                        if (activeIndex !== undefined) {
                            setStepIndex(activeIndex);
                        }
                    }
                }
            });

            driverObj.current.drive(stepIndex);
        } else {
            if (driverObj.current) {
                driverObj.current.destroy();
                driverObj.current = null;
            }
        }

        return () => {
            if (driverObj.current) {
                driverObj.current.destroy();
            }
        };
    }, [run]);

    useEffect(() => {
        if (run && driverObj.current) {
            driverObj.current.drive(stepIndex);
        }
    }, [stepIndex, run]);

    return null;
};

export default OnboardingTour;
