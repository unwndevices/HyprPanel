import { bind, Variable } from 'astal';
import { Astal, Gdk, Gtk } from 'astal/gtk3';
import { BarBoxChild } from 'src/lib/types/bar';
import { FunctionPoller } from 'src/lib/poller/FunctionPoller';
import { getMinimizedWindows, getWindowIcon, MinimizedWindow, restoreWindow } from './helpers/stash';
import options from '../../../../options';
import { isMiddleClick, isPrimaryClick, isSecondaryClick, Notify } from '../../../../lib/utils';

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

// Component to display a single window icon
const WindowIcon = ({ window }: { window: MinimizedWindow }): JSX.Element => {
    // Get the icon for the window class
    const icon = window.icon || getWindowIcon(window.class);

    // Create a formatted tooltip with both title and class
    const tooltipText = `${window.original_title}\n${window.class}`;

    return (
        <label
            className="txt-icon"
            label={icon}
            tooltipMarkup={tooltipText}
            tooltipText={tooltipText}
            hasTooltip={true}
        />
    );
};

// Component to handle window entry with click actions
const WindowEntry = ({ window }: { window: MinimizedWindow }): JSX.Element => {
    return (
        <button
            className="bar-button windowstash"
            cursor={'pointer'}
            onClick={(self, event) => {
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
            <box className="bar-button-icon windowstash">
                <WindowIcon window={window} />
            </box>
        </button>
    );
};

const WindowStash = (): BarBoxChild => {
    // Variable to control visibility
    const isVis = Variable(false);

    // Create a derived variable to handle the window entries
    const componentChildren = Variable.derive(
        [bind(minimizedWindows), bind(options.bar.customModules.windowstash.autoHide)],
        (windows, autoHide) => {
            // Update visibility based on window count and autoHide setting
            const shouldBeVisible = windows.length > 0 || !autoHide;
            isVis.set(shouldBeVisible);

            // If there are no windows and autoHide is enabled, return empty array
            if (windows.length === 0 && autoHide) {
                return [];
            }

            // Map each window to a WindowEntry component
            return windows.map((window) => (
                <WindowEntry window={window} />
            ));
        }
    );

    // Create the component
    const component = (
        <box
            className="bar_item_box_visible windowstash"
            onDestroy={() => {
                isVis.drop();
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
        props: {},
    };
};

export { WindowStash }; 