import { bind, Variable } from 'astal';
import { Astal, Gdk, Gtk } from 'astal/gtk3';
import { BarBoxChild } from 'src/lib/types/bar';
import { FunctionPoller } from 'src/lib/poller/FunctionPoller';
import { getMinimizedWindows, getWindowIcon, MinimizedWindow, restoreWindow } from './helpers/stash';
import options from '../../../../options';
import { isMiddleClick, isPrimaryClick, isSecondaryClick, Notify } from '../../../../lib/utils';
import { onMiddleClick, onPrimaryClick, onScroll, onSecondaryClick } from 'src/lib/shared/eventHandlers';
import { runAsyncCommand, throttledScrollHandler } from 'src/components/bar/utils/helpers.js';

// Create a variable to store the minimized windows
export const minimizedWindows = Variable<MinimizedWindow[]>([]);

// Create a poller to update the minimized windows list
const windowstashPoller = new FunctionPoller<MinimizedWindow[], []>(
    minimizedWindows,
    [],
    bind(options.bar.customModules.windowstash.pollingInterval),
    getMinimizedWindows
);

// Initialize the poller
windowstashPoller.initialize('windowstash');

const WindowStash = (): BarBoxChild => {
    // Variable to control visibility
    const isVis = Variable(false);

    // Get window icon
    const getIcon = (window: MinimizedWindow): string => {
        return window.icon || getWindowIcon(window.class);
    };

    // Create tooltip text for window
    const generateTooltip = (window: MinimizedWindow): string => {
        return `${window.original_title}\n${window.class}`;
    };

    // Define style map interface for TypeScript
    interface StyleMap {
        default: string;
        split: string;
        wave: string;
        wave2: string;
        [key: string]: string;
    }

    // Create window component style
    const componentClassName = Variable.derive(
        [bind(options.theme.bar.buttons.style)],
        (style: string) => {
            const styleMap: StyleMap = {
                default: 'style1',
                split: 'style2',
                wave: 'style3',
                wave2: 'style3',
            };
            return `bar_item_box_visible windowstash ${styleMap[style] || 'style1'}`;
        }
    );

    // Create window icon component
    const createWindowIcon = (window: MinimizedWindow): JSX.Element => {
        return (
            <label
                className="txt-icon"
                label={getIcon(window)}
                tooltipMarkup={generateTooltip(window)}
                tooltipText={generateTooltip(window)}
                hasTooltip={true}
            />
        );
    };

    // Handle window entry creation
    const createWindowEntry = (window: MinimizedWindow): JSX.Element => {
        return (
            <button
                className="bar-button windowstash"
                cursor={'pointer'}
                onClick={(self: any, event: any) => {
                    if (isPrimaryClick(event)) {
                        // Restore the window on primary click
                        restoreWindow(window.address);
                    }

                    if (isMiddleClick(event)) {
                        // Show notification with window details on middle click
                        Notify({
                            summary: 'Window Info',
                            body: `Class: ${window.class}\nTitle: ${window.original_title}`
                        });
                    }
                }}
            >
                {createWindowIcon(window)}
            </button>
        );
    };

    // Create the component children
    const componentChildren = Variable.derive(
        [bind(minimizedWindows), bind(options.bar.customModules.windowstash.autoHide)],
        (windows: MinimizedWindow[], autoHide: boolean) => {
            // Update visibility based on window count and autoHide setting
            const shouldBeVisible = windows.length > 0 || !autoHide;
            isVis.set(shouldBeVisible);

            // If there are no windows and autoHide is enabled, return empty array
            if (windows.length === 0 && autoHide) {
                return [];
            }

            // Map each window to a window entry component
            return windows.map((window) => createWindowEntry(window));
        }
    );

    // Create the component
    const component = (
        <box
            className={componentClassName()}
            onDestroy={() => {
                isVis.drop();
                componentClassName.drop();
                componentChildren.drop();
            }}
        >
            {componentChildren()}
        </box>
    );

    // Return the component configuration
    return {
        component,
        isVisible: true,
        isVis,
        boxClass: 'windowstash',
        isBox: true,
        props: {
            setup: (self: Astal.Button): void => {
                let disconnectFunctions: (() => void)[] = [];

                Variable.derive(
                    [bind(options.bar.scrollSpeed)],
                    () => {
                        // Clean up previous event handlers
                        disconnectFunctions.forEach((disconnect) => disconnect());
                        disconnectFunctions = [];

                        const throttledHandler = throttledScrollHandler(options.bar.scrollSpeed.get());

                        // Add scroll support
                        disconnectFunctions.push(
                            onScroll(
                                self,
                                throttledHandler,
                                // Default scroll actions can be customized via options if needed
                                'hyprctl dispatch workspace -1',
                                'hyprctl dispatch workspace +1'
                            )
                        );
                    }
                );
            }
        }
    };
};

export { WindowStash }; 