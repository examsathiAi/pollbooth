"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../providers/SocketProvider";

interface LivePollUpdate {
  pollId: string;
  totalVotes: number;
  results: Array<{
    option: string;
    index: number;
    count: number;
    percentage: number;
  }>;
  totalOpinions: number;
  velocity: number;
  isLive: boolean;
}

export function useRealtimePolls(pollIds: string[]) {
  const { socket, isConnected } = useSocket();
  const [liveUpdates, setLiveUpdates] = useState<Record<string, LivePollUpdate>>({});
  const [connectedPolls, setConnectedPolls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !isConnected || pollIds.length === 0) return;

    pollIds.forEach((pollId) => {
      socket.emit("join_poll", pollId);
    });
    setConnectedPolls(new Set(pollIds));

    socket.on("poll_updated", (update: LivePollUpdate) => {
      setLiveUpdates((prev) => ({
        ...prev,
        [update.pollId]: update,
      }));
    });

    return () => {
      pollIds.forEach((pollId) => {
        socket.emit("leave_poll", pollId);
      });
      socket.off("poll_updated");
    };
  }, [socket, isConnected, pollIds]);

  return {
    liveUpdates,
    isConnected,
    connectedPolls,
  };
}

export function useActivityFeed() {
  const { socket, isConnected } = useSocket();
  const [activities, setActivities] = useState<
    Array<{
      id: string;
      type: "vote" | "opinion" | "milestone";
      message: string;
      timestamp: Date;
      pollId: string;
    }>
  >([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("new_activity", (activity) => {
      setActivities((prev) => {
        const newActivity = { ...activity, timestamp: new Date(activity.timestamp) };
        return [newActivity, ...prev.slice(0, 4)];
      });
    });

    return () => {
      socket.off("new_activity");
    };
  }, [socket, isConnected]);

  return { activities };
}
