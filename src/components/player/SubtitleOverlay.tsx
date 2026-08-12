import React, { useEffect, useState } from 'react';
import { useSubtitleStore } from '../../store/useSubtitleStore';
import { SubtitleCue } from '../../lib/subtitleParser';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
}

export const SubtitleOverlay: React.FC<Props> = ({ videoRef, currentTime }) => {
  const { activeTrackId, availableTracks, style } = useSubtitleStore();
  const [currentText, setCurrentText] = useState<string>('');

  useEffect(() => {
    if (activeTrackId === 'none') {
      setCurrentText('');
      return;
    }

    const activeTrack = availableTracks.find(t => t.id === activeTrackId);
    if (!activeTrack) {
      setCurrentText('');
      return;
    }

    // Adjusted current time with sync delay
    const targetTime = currentTime + style.syncDelay;

    // 1. If uploaded track with cues array
    if (activeTrack.cues && activeTrack.cues.length > 0) {
      const match = activeTrack.cues.find(
        (c) => targetTime >= c.start && targetTime <= c.end
      );
      setCurrentText(match ? match.text : '');
      return;
    }

    // 2. If embedded HTML5 TextTrack
    if (videoRef.current && activeTrack.source === 'embedded' && activeTrack.htmlTrackIndex !== undefined) {
      const htmlTrack = videoRef.current.textTracks[activeTrack.htmlTrackIndex];
      if (htmlTrack && htmlTrack.activeCues && htmlTrack.activeCues.length > 0) {
        const activeCue = htmlTrack.activeCues[0] as VTTCue;
        if (activeCue && activeCue.text) {
          setCurrentText(activeCue.text.replace(/<[^>]*>/g, ''));
          return;
        }
      }
    }

    setCurrentText('');
  }, [currentTime, activeTrackId, availableTracks, style.syncDelay, videoRef]);

  if (!currentText || activeTrackId === 'none') return null;

  // Font Size Map
  const fontSizeClasses = {
    small: 'text-xs sm:text-sm md:text-base',
    medium: 'text-sm sm:text-base md:text-lg lg:text-xl font-bold',
    large: 'text-base sm:text-xl md:text-2xl lg:text-3xl font-extrabold',
    xlarge: 'text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black',
  }[style.fontSize];

  // Font Family Map
  const fontFamilyClasses = {
    vazir: 'font-sans',
    jakarta: 'font-sans tracking-tight',
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[style.fontFamily];

  // Background Style Map
  const bgClasses = {
    glass: 'bg-slate-950/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl px-4 sm:px-6 py-2 sm:py-3 text-center max-w-[90%] sm:max-w-[80%]',
    solid: 'bg-black/90 border border-white/10 rounded-xl px-4 py-2 text-center max-w-[90%]',
    minimal: 'drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)] text-center max-w-[90%]',
    none: 'drop-shadow-md text-center max-w-[90%]',
  }[style.bgStyle];

  return (
    <div 
      className="absolute left-0 right-0 z-25 pointer-events-none flex justify-center items-center px-4 transition-all duration-150"
      style={{ bottom: `${style.verticalPosition}%` }}
    >
      <div 
        className={`${bgClasses} ${fontSizeClasses} ${fontFamilyClasses} leading-relaxed transition-all`}
        style={{ color: style.color }}
      >
        {currentText.split('\n').map((line, idx) => (
          <p key={idx} className="my-0.5 whitespace-pre-line">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};
