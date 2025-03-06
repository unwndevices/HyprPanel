import { sh } from 'src/lib/utils';
import options from '../../../../../options';
import { Opt } from 'src/lib/option';
import GLib from 'gi://GLib?version=2.0';
/**
 * Interface representing a minimized window
 */
export interface MinimizedWindow {
    address: string;
    display_title: string;
    class: string;
    original_title: string;
    icon: string;
}

/**
 * Get the list of minimized windows from the hypr-minimizer cache
 * @returns Array of minimized windows
 */
export const getMinimizedWindows = async (): Promise<MinimizedWindow[]> => {
    try {
        const cacheFile = '/tmp/hypr-minimizer/windows.json';
        const result = await sh(`cat ${cacheFile}`);

        if (!result || result.trim() === '') {
            return [];
        }

        return JSON.parse(result) as MinimizedWindow[];
    } catch (error) {
        console.error('Error getting minimized windows:', error);
        return [];
    }
};


/**
 * Restore a minimized window
 * @param windowId The address of the window to restore
 */
export const restoreWindow = async (windowId: string): Promise<void> => {
    try {
        const homeDir = GLib.get_home_dir();
        await sh(`python ${homeDir}/.config/hypr/scripts/hypr-minimizer.py restore ${windowId}`);
    } catch (error) {
        console.error(`Error restoring window ${windowId}:`, error);
    }
};

/**
 * Get the appropriate icon for a window class
 * @param className The window class name
 * @returns The icon string
 */
export const getWindowIcon = (className: string): string => {
    const defaultIcon = '󰀀';  // Default window icon if no match is found
    const iconMapOpt = options.bar.customModules.windowstash.iconMap as Opt<Record<string, string>>;

    if (!iconMapOpt) {
        return defaultIcon;
    }

    const iconMap = iconMapOpt.get();

    // Try to find a match in the iconMap (case-sensitive first)
    if (className in iconMap) {
        return iconMap[className];
    }

    // Try case-insensitive match
    const lowerClassName = className.toLowerCase();
    const match = Object.entries(iconMap).find(([key]) => key.toLowerCase() === lowerClassName);
    if (match) {
        return match[1];
    }

    // Return default icon if no match found
    return defaultIcon;
}; 