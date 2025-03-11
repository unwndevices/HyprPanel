import { sh } from 'src/lib/utils';
import options from '../../../../../options';
import { Opt } from 'src/lib/option';
import GLib from 'gi://GLib?version=2.0';

// Track if we've cleared the cache on startup
let hasClearedCache = false;

/**
 * Clear the minimized windows cache file
 */
const clearWindowsCache = async (): Promise<void> => {
    try {
        // Create directory if it doesn't exist
        await sh(`mkdir -p /tmp/hypr-minimizer`);
        const cacheFile = '/tmp/hypr-minimizer/windows.json';
        await sh(`echo '[]' > ${cacheFile}`);
    } catch (error) {
        console.error('Error clearing windows cache:', error);
    }
};

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

        // Ensure cache directory and file exist
        if (!hasClearedCache) {
            await clearWindowsCache();
            hasClearedCache = true;
        }

        // Check if file exists before trying to read it
        const exists = await sh(`test -f ${cacheFile} && echo "exists"`);
        if (!exists) {
            await clearWindowsCache();
        }

        const result = await sh(`cat ${cacheFile}`);
        return JSON.parse(result || '[]') as MinimizedWindow[];
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
    const defaultIcon = '';  // Fallback default icon
    const iconMapOpt = options.bar.customModules.windowstash.iconMap as Opt<Record<string, string>>;

    // Common application patterns with default icons
    const defaultPatterns: Record<string, string> = {
        'terminal': '󰆍',    // Terminal pattern
        'code': '󰨞',       // Code editors
        'chrome': '󰊯',     // Chrome browser
        'firefox': '󰈹',    // Firefox browser
        'brave': '󰇧',      // Brave browser
        'discord': '󰙯',    // Discord
        'spotify': '󰓇',    // Spotify
        'steam': '󰓓',      // Steam
        'vlc': '󰕼',        // VLC media player
        'file': '󰉋',       // File managers
        'image': '󰋩',      // Image viewers
        'video': '󰕧',      // Video players
        'pdf': '󰈦',        // PDF viewers
    };

    // First check user-defined iconMap
    if (iconMapOpt) {
        const iconMap = iconMapOpt.get();

        // Try exact match first
        if (className in iconMap) {
            return iconMap[className];
        }

        // Try case-insensitive match
        const lowerClassName = className.toLowerCase();
        const match = Object.entries(iconMap).find(([key]) => key.toLowerCase() === lowerClassName);
        if (match) {
            return match[1];
        }
    }

    // If no match in user iconMap, try matching against default patterns
    const lowerClassName = className.toLowerCase();
    for (const [pattern, icon] of Object.entries(defaultPatterns)) {
        if (lowerClassName.includes(pattern)) {
            return icon;
        }
    }

    // Return default icon if no match found
    return defaultIcon;
}; 