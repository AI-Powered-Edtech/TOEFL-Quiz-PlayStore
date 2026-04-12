import { useState, useEffect } from 'react';

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

let apiLoaded = false;
let apiLoading = false;
const callbacks: (() => void)[] = [];

export const useYouTubeScript = () => {
    const [loaded, setLoaded] = useState(apiLoaded);

    useEffect(() => {
        if (apiLoaded) {
            setLoaded(true);
            return;
        }

        if (apiLoading) {
            callbacks.push(() => setLoaded(true));
            return;
        }

        apiLoading = true;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            apiLoaded = true;
            apiLoading = false;
            setLoaded(true);
            callbacks.forEach(cb => cb());
            callbacks.length = 0;
        };
    }, []);

    return loaded;
};
