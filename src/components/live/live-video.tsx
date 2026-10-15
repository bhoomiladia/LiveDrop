"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { IconVolume } from "@/components/ui/icons";
import { LiveBadge } from "@/components/ui/kit";

// Viewer side: watches the seller's camera and mic from the show's LiveKit room.
export default function LiveVideo({ showId, live }: { showId: string; live: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attach = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideo(true);
      }
      if (track.kind === Track.Kind.Audio && audioRef.current) track.attach(audioRef.current);
    };
    const detach = (track: RemoteTrack) => {
      track.detach();
      if (track.kind === Track.Kind.Video) setHasVideo(false);
    };

    room
      .on(RoomEvent.TrackSubscribed, attach)
      .on(RoomEvent.TrackUnsubscribed, detach)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsTap(!room.canPlaybackAudio))
      .on(RoomEvent.Disconnected, () => setHasVideo(false));

    fetch(`/api/shows/${showId}/video-token`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Video unavailable.");
        if (cancelled) return;
        await room.connect(body.url, body.token);
        if (cancelled) return;
        // The seller may already be publishing when we arrive.
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.trackPublications.values()) if (pub.track) attach(pub.track as RemoteTrack);
        }
        setNeedsTap(!room.canPlaybackAudio);
      })
      .catch((err) => {
        if (!cancelled) setProblem((err as Error).message);
      });

    return () => {
      cancelled = true;
      void room.disconnect();
      roomRef.current = null;
    };
  }, [showId, live]);

  return (
    <div className="relative rounded-[10px] overflow-hidden bg-ink aspect-video">
      <video ref={videoRef} autoPlay playsInline muted={false} className={`w-full h-full object-cover ${hasVideo ? "" : "hidden"}`} />
      <audio ref={audioRef} autoPlay />
      {!hasVideo && (
        <div className="absolute inset-0 grid place-items-center text-center p-6 text-paper/60 text-sm">
          {!live ? "Video starts when the show goes live." : problem ? problem : "Waiting for the seller's camera…"}
        </div>
      )}
      {live && hasVideo && <LiveBadge className="absolute top-3 left-3" />}
      {needsTap && hasVideo && (
        <button
          onClick={() => roomRef.current?.startAudio().then(() => setNeedsTap(false))}
          className="absolute bottom-3 right-3 h-9 px-3.5 rounded-[5px] bg-paper text-ink text-sm font-medium inline-flex items-center gap-2"
        >
          <IconVolume /> Tap for sound
        </button>
      )}
    </div>
  );
}
